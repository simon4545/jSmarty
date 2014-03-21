var nc = typeof exports !== 'undefined' ? exports : {};
var fs, path, filter, util;
if (env == 'node') {
    fs = require('./file'), path = require('path');
    filter = require('./pages'), util = require('./util');
}

var ObjProto = Object.prototype;
var toString = ObjProto.toString;
var reMarker = function () {
    this._tokens = [];
    this._included = [];
    this._basePath = '';
    this._vars = {};
};
reMarker.prototype.startTag = '{';
reMarker.prototype.endTag = '}';
reMarker.prototype.setBasePath = function (basePath) {
    this._basePath = basePath;
    return this;
}
reMarker.prototype.setIncluded = function (val) {
    this._included.push(val);
    return this;
}
reMarker.prototype.getIncluded = function () {
    return this._included;
}
reMarker.prototype.parse = function (templ) {
    var TAG_REGEX = escapeRegExp(this.startTag) + '(?:\\s*)((?:[\\\/\\$"])*[\\w\\*"]+)(?:\\s*)(.*?)(?:\\1*)(?:\\s*)' + escapeRegExp(this.endTag);
    var matchRegexp = new RegExp(TAG_REGEX, 'gim');
    var _nodeToken = [],
        _matched, _lastIndex = 0;
    while (_matched = matchRegexp.exec(templ)) {
        if (_lastIndex != _matched.index) {
            _nodeToken.push({
                type: 'text',
                value: templ.substring(_lastIndex, _matched.index),
                matched: templ.substring(_lastIndex, _matched.index),
                index: _lastIndex
            });
        }
        _nodeToken.push({
            type: 'expression',
            expr: _matched[1],
            value: _matched[2],
            matched: _matched[0],
            index: _matched.index
        });
        _lastIndex = _matched.index + _matched[0].length;
    }
    //得到所有的token
    _nodeToken.push({
        type: 'text',
        value: templ.substring(_lastIndex),
        matched: templ.substring(_lastIndex),
        index: _lastIndex
    });
    this.parser = new Parser(_nodeToken, this._vars);
    return this.parser.parse(this);
};
reMarker.prototype.proc = function (templ, data) {
    var that = this,
        _complied,content;
    try {
        this._vars = data;
        content = this.parse(templ);
        _complied = new Function('$data', '$util', content + ';return _out.join("");');
    } catch (ex) {
        throw new Error('模板解析出错' + ex.message);
    }
    if (!data) {
        return function ($data) {
            var $util = $smarty;
            return _complied($data, $util);
        };
    }
    //todo:以后要删除这段，这段方式没有{script}好
    var _html = _complied.call(this, data, $smarty);
    /*var _temp='';
     for(var i=0;i<this._included.length;i++){
     var _path=path.dirname(this._included[i]);
     _path=_path.replace(this._basePath,'/');
     var _fileName=path.join(_path,'index.js');
     _temp += '<script src="'+util.formatUrlSplit(_fileName)+'"></script>\r\n';
     }
     if(_html.match(/<\/body>([\s|\S]*?)<\/html>/i)){
     _html=_html.replace(/(<\/body>([\s|\S]*?)<\/html>)/ig,_temp+'$1');
     }else{
     _html+=_temp;
     }*/
    return _html;
}
var $smarty = {
    'date_format': function (value, format, default_date) {
        if (!value && !default_date) {
            return 'date_format语法错误';
        }
        var t = (value || default_date);
        if (typeof t !== "number") {
            t = strtotime(t);
        }
        var result = strftime(new Date(t), (format || '%Y/%m/%d'));
        return result;
    },
    'truncate': function (s, length, etc, breakWords, middle) {
        length = length ? length : 80;
        etc = (etc != null) ? etc : '...';

        if (s.length <= length) {
            return s;
        }

        length -= Math.min(length, etc.length);
        if (middle) {
            //one of floor()'s should be replaced with ceil() but it so in Smarty
            return s.slice(0, Math.floor(length / 2)) + etc + s.slice(s.length - Math.floor(length / 2));
        }

        if (!breakWords) {
            s = s.slice(0, length + 1).replace(/\s+?(\S+)?$/, '');
        }

        return s.slice(0, length) + etc;
    },
    'default': function (value, default_value) {
        return value || default_value||'';
    },
    'fsize_format': function (size, format, precision) {
        // Defaults
        format = format || '';
        precision = precision || 2;
        // Sizes
        var sizes = {
            'TB': 1099511627776,
            'GB': 1073741824,
            'MB': 1048576,
            'KB': 1024,
            'B': 1
        };
        // Get "human" filesize
        var result = '';
        for (var s in sizes) {
            if (size > sizes[s] || s == strtoupper(format)) {
                result = number_format(size / sizes[s], precision) + ' ' + s;
                break;
            }
        }
        return result;
    }
};
$smarty.expr = function (variable, localVar) {
    var _var = new TextReader(variable);
    var words = _var.read();
    if (words.length <1) {
        return variable;
    }

    var exprString;
    //todo:判断是不是局部变量，且不是字符串类型，这里不严谨
    //如果是字符串或数字，则是静态内容，不需要处理
    if(words[0]['string'] || words[0]['num']){
        exprString = words[0]['string'] || words[0]['num'];
    }
    else if (!localVar) {
        exprString = '$data.' + words[0]['var'];
    }
    else {
        exprString = words[0]['var'];
    }
    if (words.length > 1) {
        var i = 1;
        for (; i < words.length; i++) {
            var modifier = $smarty[words[i]['modifier']];
            if (modifier) {
                exprString = '$util.' + words[i]['modifier'] + '(' + exprString +  _attr(i+1) + ')';
                //variable= modifier(words[i+1]);
            }
        }
    }
    function _attr(start){
        //没有更多的参数，直接返回
        if(!words[start]){
            return '';
        }
        var _attri=[];

        for(var k = start; k < words.length; k++){
            if(!words[k]['modifier']){
                _attri.push(words[k]['string']||words[k]['num'])
            }else{
                break;
            }
        }
        i=k-1;
        //如果是有属性的在前面补一个逗号
        if(_attri.length!=0){
            _attri.unshift('');
        }
        return _attri.join(',');
    }
    return exprString;
}
$smarty.value = function (variable) {
    //variable=$smarty.expr(variable);
    if (toString.call(variable) === '[object Object]' || toString.call(variable) === '[object Array]') {
        return JSON.stringify(variable);
    } else {
        return variable;
    }
}
nc.reMarker = reMarker;

var TextReader = function (inChars) {
    this.inChars = inChars || '';
    this.words = [];
}
TextReader.prototype = {
    start: 0,
    end: 0,
    VAR_REGEXP: /[\w\d_\-\.\[\]\'\"]/i,

    read: function () {
        var l = this.inChars.length;
        for (; this.start <= l; this.start++) {
            switch (this.inChars.charAt(this.start)) {
                // 过滤空白字符
                case '\t':
                case '\r':
                case ' ':
                    break;
                // 识别符号
                case '@':
                    continue;
                case '|':
                    // 识别符号
                    this.start = this.findModifier(this.start + 1);
                    continue;
                case '$':
                    // 识别变量表达式
                    this.start = this.findVariable(this.start + 1);
                    continue;
                case '"':
                case '\'':
                    this.start = this.findString(this.start + 1);
                    continue;
                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    this.start = this.findNumber(this.start);
                    continue;
                case ':':
                    //this.start=this.findString(this.start+1);
                    continue;

            }

        }
        ;
        return this.words;
    },
    skip: function (l) {

    },
    checkVariable: function (char) {
        return char.match(this.VAR_REGEXP);
    },
    checkModifier: function (char) {
        return char != ':';
    },
    findNumber: function (idx) {
        var l = this.inChars.length;
        var _string = '';
        for (var i = idx; i < l; i++) {
            var char = this.inChars.charAt(i);
            if (parseInt(char) == char) {
                _string += char;
            } else {
                i--;
                break;
            }
        }
        this.words.push({'num':_string});
        return i;
    },
    findVariable: function (idx) {
        var l = this.inChars.length;
        var _string = '';
        for (var i = idx; i < l; i++) {
            var char = this.inChars.charAt(i);
            if (this.checkVariable(char)) {
                _string += char;
            } else {
                i--;
                break;
            }
        }
        this.words.push({'var':_string});
        return i;
    },
    findString: function (idx) {
        var l = this.inChars.length;
        var _string = '';
        for (var i = idx; i < l; i++) {
            var char = this.inChars.charAt(i);
            if (char != '\'' && char != '"') {
                _string += char;
            } else if (char == '\\' && (this.inChars.charAt(i + 1) == '\'' || this.inChars.charAt(i + 1) == '"')) {
                _string += '\\\'';
                i++;
            } else {
                //i++;
                break;
            }
        }
        this.words.push({'string':'\'' + _string + '\''});
        return i;
    },
    findModifier: function (idx) {
        var l = this.inChars.length;
        var _string = '';
        for (var i = idx; i < l; i++) {
            var char = this.inChars.charAt(i);
            if (this.checkModifier(char)) {
                _string += char;
            } else {
                i--;
                break;
            }
        }
        this.words.push({'modifier':_string});
        return i;
    }
}