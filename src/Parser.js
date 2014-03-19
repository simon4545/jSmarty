var VAR_REGEX = /\$(([a-zA-Z_][a-zA-Z0-9_]*)(\.[a-zA-Z_][a-zA-Z0-9_]*)*(\[[^\]]+\]*)*)/ig;
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
            this._output += "_out.push($util.value(" + phpToJSVar(expr + token.value, Parser.openEachTag) + "));\r\n";
        }
    }

    this._output += '};'
    return this._output;
}
Parser.prototype.getAttributes = function(attributes) {
    if (!attributes) {
        return [];
    }
    var _matched, _i = 0;
    var attributes_new = {};
    while (_matched = ATTRI_REGEX.exec((' ' + attributes))) {
        var key;
        var value;
        if (typeof _matched[1] === 'undefined') {
            key = _i;
            value = _matched[0].replace(/^\s+|\s+$/g, '');
            _i++;
        } else {
            key = _matched[1];
            value = _matched[2] || _matched[3] || _matched[4];
        }
        attributes_new[key] = value;
    }

    attributes = attributes_new;
    return attributes;
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
Parser.prototype.modifiers = {
    'date_format': function(value, format, default_date) {
        if (!value && !default_date) {
            return 'date_format语法错误';
        }
        var t = (value || default_date);
        if (typeof t !== "number") {
            t = strtotime(t, time());
        }
        var result = strftime((format || '%b %e %Y'), t);
        return result;
    },
    'default': function(value, default_value) {
        return value || default_value;
    },
    'fsize_format': function(size, format, precision) {
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
        if (attributes['file'] == undefined) {
            return 'include语法错误' + content;
        }
        if (env == 'node') {
            return 'include语法不被支持';
        }
        var var_file, var_assign;
        for (var arg_name in attributes) {
            var arg_value = attributes[arg_name];
            if (arg_name == 'file') {
                var_file = arg_value;
                delete attributes[arg_name];
                continue;
            }
            if (arg_name == 'assign') {
                var_assign = arg_value;
                continue;
            }
            if (arg_value.indexOf('$') == 0) {
                var nativeKey = phpToJSVar(arg_value, Parser.openEachTag);
                //todo:simon 这块有bug
                attributes[arg_name] = eval('this._vars.' + nativeKey);
            }
        }
        var url = path.normalize(path.join(this._reMarker._basePath, var_file));
        var content = fetch(url, this._reMarker._basePath, attributes);
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
    assign: function(content, attr) {
        if (typeof attr['var'] === 'undefined' || typeof attr['value'] === 'undefined') {
            return 'assign语法错误' + content;
        }
        var value = attr['value'];
        if (value === '[]') { // Make an object
            value = {};
        }
        var key = attr['var'].replace(/'|"/ig, '');
        this._vars[key] = value;
        //要做成转换语句了
        return 'var ' + key + '="' + phpToJSVar(attr.value, Parser.openEachTag) + '";';
    },
    //
    'foreachelse': function(content, attr) {
        return '}}else{{';
    },
    //循环
    foreach: function(content, attributes) { // Sections
        var from = attributes.from;
        var item = attributes.item;
        if (!from && !item) {
            return 'assign语法错误' + content;
        }

        var key = attributes.key || 'k' + Math.round(Math.random() * 10000);
        var name = attributes.name || Math.round(Math.random() * 10000);

        var _temp = [];
        //TODO foreach.show没有实现
        _temp.push('~function(){');
        _temp.push('if(Object.prototype.toString.call({$var})==="[object Array]" && {$var}.length>0){ '.replace(/\{\$var\}/ig,phpToJSVar(from, Parser.openEachTag)));
        _temp.push('var iter=0;var length = 0;for (var k in ' + phpToJSVar(from, Parser.openEachTag) + ') {++length;}');
        _temp.push('for (var i in ' + phpToJSVar(from, Parser.openEachTag) + ') {');
        _temp.push('var smarty={};smarty.foreach={};');
        _temp.push('smarty.foreach["' + name + '"] ={};');
        _temp.push('smarty.foreach["' + name + '"].index= iter;');
        _temp.push('smarty.foreach["' + name + '"].iteration= iter+1;');
        _temp.push('smarty.foreach["' + name + '"].first= iter==0;');
        _temp.push('smarty.foreach["' + name + '"].last= iter==length-1;');
        _temp.push('smarty.foreach["' + name + '"].total= length;');
        _temp.push('var ' + item + '= ' + phpToJSVar(from, Parser.openEachTag) + '[i];');
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

        for (i in attributes) {
            if (this.needSkip(i)) continue;
            attribute = attributes[i];
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
                            statement += phpToJSVar(attribute, Parser.openEachTag) + ' ';
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