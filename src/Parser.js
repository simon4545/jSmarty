//var ATTRI_REGEX = /(?:[\s]*(?:([^=\s]+?)=)?((?:"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|[^\s'"]+)+))+?/ig;
var ATTRI_REGEX = /(?:[\s]*(?:([^=\s]+?)\s*=\s*)?(?:(?:"([^"\\]*)"|'([^'\\]*)'|([^\s'"]+)+)))+?/ig;
/**
 * 取到模板文件并渲染mock数据
 * @param url
 * @returns {string}
 */
function fetch(url, basePath, preparedData) {
    var data, _html = '';
    data = fs.getContentText(url);
    var TEMPLATE_REGEX = /<!--\s*template\s*-->([\s|\S]*?)<!--\s*\/template\s*-->/ig;
    var match = data.match(TEMPLATE_REGEX);
    while (match = TEMPLATE_REGEX.exec(data)) {
        _html += match[1];
    }
    var _html = filter.HTMLFilter(_html, url, basePath, preparedData);
    return _html;
}

function Parser(tokens, vars) {
    this._tokens = tokens;
    this._output = '';
    this._vars = vars || {};
}

Parser.openEachTag = 0;
Parser.openLiteralTag = 0;
Parser.prototype.parse = function(reMarker) {
    var _matched;
    this._reMarker = reMarker || {};
    //with($data){
    this._output = 'var _out=[];with($data){';
    for (var i = 0; i < this._tokens.length; i++) {
        var token = this._tokens[i];
        //防止literal中止
        if (token.expr == '/literal') {
            this.functions[token.expr].call(this, attributes, this.getAttributes(attributes));
            continue;
        }
        if (token.type == 'text' || Parser.openLiteralTag > 0) {
            this._output += "_out.push('" + removeUnsafe(token.matched) + "');\r\n";
            continue;
        }

        var expr = token.expr;
        expr = expr == 'elseif' ? 'if' : expr;
        var attributes = token.value;
        //表达示
        if (this.functions[expr]) {
            this._output += this.functions[expr].call(this, token.matched, this.getAttributes(attributes));
        } else {
            //变量或非正常表达式
            var _expr=token.matched.substring(this._reMarker.startTag.length,token.matched.length-this._reMarker.endTag.length);
            this._output += "_out.push($util.value(" + $smarty.expr(_expr,Parser.openEachTag) + "));\r\n";
        }
    }

    this._output += '};'
    return this._output;
}
Parser.prototype.getAttributes = function(attributes) {
    if (!attributes) {
        return [];
    }
    var _var = new TextReader(attributes);
    var words = _var.read();
    return words;
}

Parser.prototype.needSkip = function(param) {
    var result = false;
    switch (param) {
        case '':
        case 'index':
        case 'input':
        case '__proto__':
            // For some reason, Chrome is the only browser which adds these
            result = true;
            break;
    }
    return result;
}

Parser.prototype.functions = {
    //注释
    '*': function(content, attribute) {
        return ''; //'<!--' + content + '-->';
    },
    '/foreach': function(content, attribute) {
        var _temp = [];

        _temp.push('}/*for end*/}/*if end*/');
        _temp.push('}();');
        Parser.openEachTag--;
        return _temp.join('\r\n');
    },
    'include': function(content, attributes) {
        if(!attributes || attributes.length<3){
            return 'include语法错误' + content;
        }
        var var_assign,attrs={},key,value;
        attributes.idx=0;
        for(;attributes.idx<attributes.length;){
            key=removeQuote(attributes[attributes.idx]);
            value=wrapModifier(attributes.idx+2,attributes[attributes.idx+2],attributes);
            attrs[key]=value;
            if(key!='file'){
                var_assign=key;
            }
        }
        if (env != 'node') {
            return '_out.push("include语法不被支持");';
        }
        if(!attrs.file){
            return 'include语法错误' + content;
        }
        var url = path.normalize(path.join(this._reMarker._basePath,removeQuote(attrs.file) ));
        var content = fetch(url, this._reMarker._basePath, attrs);
        //记录当前被调用的文件以备以后自动加载
        this._reMarker.setIncluded(url);
        if (var_assign) {
            this._vars[var_assign] = content;
            return 'var ' + var_assign + '=\'' + removeUnsafe(content) + '\';';
        } else {
            return '_out.push(\'' + removeUnsafe(content) + '\');';
        }

        //return new reMarker().setIncluded(true).parse(content);
        //var template_id = attributes['file'].indexOf('.smarty') != -1 ? (attributes['file'].substring(0, attributes['file'].lastIndexOf('.'))) : attributes['file'];
        //return '_out.push(\'<script type="text/javascript" src="' + template_id + '.js"><\/scr' + 'ipt>\');';
    },
    //赋值
    assign: function(content, attributes) {
        if(!attributes || attributes.length<3){
            return 'assign语法错误' + content;
        }
        var attrArr=[];
        attributes.idx=0;
        for(;attributes.idx<attributes.length;){
            attrArr.push(wrapModifier(attributes.idx,attributes[attributes.idx],attributes));
        }
        var attrs={},key,value;
        attrArr.idx=0;
        for(;attrArr.idx<attrArr.length;){
            key=attrArr[attrArr.idx];
            if(key=='var'){
                value=findArray('value',attrArr,attrArr.idx+2);

            }
            if(key=='value'){
                value=findArray('var',attrArr,attrArr.idx+2);
            }
            attrs[key]=value;
        }
        var value = attrs['value'];
        var key =removeQuote(attrs['var']) ;
        this._vars[key] = value;
        //要做成转换语句了
        return 'var ' + key + '=' +value + ';';
    },
    //
    'foreachelse': function(content, attr) {
        return '}}else{{';
    },
    //循环
    foreach: function(content, attributes) { // Sections
        var var_assign,attrs={},key,value;
        attributes.idx=0;
        for(;attributes.idx<attributes.length;){
            key=attributes[attributes.idx];
            value=wrapModifier(attributes.idx+2,attributes[attributes.idx+2],attributes);
            attrs[key]=value;
        }
        var from = attrs.from;
        var item = attrs.item;
        if (!from && !item) {
            return 'assign语法错误' + content;
        }

        var key = attrs.key || 'k' + Math.round(Math.random() * 10000);
        var name = attrs.name || 'n'+Math.round(Math.random() * 10000);
        name=removeQuote(name);
        key=removeQuote(key);
        from=removeQuote(from);
        item=removeQuote(item);

        var _temp = [];
        var _from=$smarty.expr(from);
        //TODO foreach.show没有实现
        _temp.push('~function(){');
        _temp.push('if(typeof({$var})!="undefined" && Object.prototype.toString.call({$var})==="[object Array]" && {$var}.length>0){ '.replace(/\{\$var\}/ig,_from));
        _temp.push('var iter=0;var length = 0;for (var k in ' + _from + ') {++length;}');
        _temp.push('for (var i in ' + _from + ') {');
        _temp.push('var smarty={};smarty.foreach={};');
        _temp.push('smarty.foreach["' + name + '"] ={};');
        _temp.push('smarty.foreach["' + name + '"].index= iter;');
        _temp.push('smarty.foreach["' + name + '"].iteration= iter+1;');
        _temp.push('smarty.foreach["' + name + '"].first= iter==0;');
        _temp.push('smarty.foreach["' + name + '"].last= iter==length-1;');
        _temp.push('smarty.foreach["' + name + '"].total= length;');
        _temp.push('var ' + item + '= ' + _from + '[i];');
        key && _temp.push(key + '= i;');
        _temp.push('iter++;');
        Parser.openEachTag++;
        return _temp.join('\r\n');
    },
    "/if": function(content, attributes) {
        return '};';
    },
    "else": function(content, attributes) {
        return '}else{';
    },
    "if": function(content, attributes) {
        var statements = '';
        var values = [];

        var attribute, statement, is, left, middle, right;
        var reset = function() {
            statement = '';
            is = false;
            left = '';
            middle = '';
            right = '== 0';
        };
        var add = function() {
            statement = is ? '(' + statement + left + ') ' + middle + right : statement;
            statements += statement;
        };

        reset();
        var attrs=[];
        attributes.idx=0;
        for(;attributes.idx<attributes.length;){
            attrs.push(wrapModifier(attributes.idx,attributes[attributes.idx],attributes));
        }
        for (var i in attrs) {
            if (this.needSkip(i)) continue;
            attribute = attrs[i];
            if (this.needSkip(attribute)) continue;
            switch (attribute) {
                case 'is':
                    is = true;
                    break;
                case 'not':
                    right = right === '== 0' ? '!= 0' : '== 0';
                    break;
                case 'div':
                    break;
                case 'even':
                    middle = '% 2 ';
                    break;
                case 'odd':
                    right = right === '== 0' ? '!= 0' : '== 0';
                    middle = '% 2 ';
                    break;
                case 'by':
                    left = left + ' / ';
                    break;
                case '||':
                case '&&':
                    add();
                    statements += attribute + ' ';
                    reset();
                    break;
                default:
                    if (typeof this.operators[attribute] !== 'undefined') {
                        statement += this.operators[attribute] + ' ';
                    } else {
                        if (is) {
                            left += attribute + ' ';
                        } else {
                            statement += attribute + ' ';
                        }
                    }
                    break;
            }
        }
        add();
        var _temp = 'if(' + statements + '){';
        if (content.match(/\{elseif\s+[^\}]*\}/i)) {
            _temp = '}else if(' + statements + '){'
        }
        return _temp;
    },
    //字面常量
    literal: function(content, attributes) {
        Parser.openLiteralTag++;
        return '';
    },
    //字面常量
    '/literal': function(content, attributes) {
        Parser.openLiteralTag--;
        return '';
    }
}
Parser.prototype.buildTagMatch = function(regexp, ruler) {
    var r = '';
    if (regexp instanceof RegExp) {
        regexp.global && (r += 'g');
        regexp.ignoreCase && (r += 'i');
        regexp.multiline && (r += 'm');
        regexp = regexp.source;
    }
    r = r || ruler || '';
    return new RegExp(escapeRegExp(this._reMarker.startTag) + escapeRegExp(regexp) + escapeRegExp(this._reMarker.endTag), r);
}
Parser.prototype.operators = {
    "eq": '==',
    "ne": '!=',
    "neq": '!=',
    "gt": '>',
    "lt": '<',
    "ge": '>=',
    "gte": '>=',
    "le": '<=',
    "lte": '<=',
    // not:        '!',
    "and": '&&',
    "or": '||',
    "mod": '%',

    '==': '==',
    '===': '===',
    '!=': '!=',
    '>': '>',
    '<': '<',
    '>=': '>=',
    '<=': '<=',
    '!': '!',
    '%': '%',

    '(': '(',
    ')': ')',

    '0': 0,
    'false': false,

    'null': null,
    'undefined': null
};