var nc = typeof exports !== 'undefined' ? exports : {};
var fs, path, filter, util;
if (env == 'node') {
    fs = require('./file.js'), path = require('path');
    filter = require('./pages.js'), util = require('./util.js');
}

var ObjProto = Object.prototype;
var toString = ObjProto.toString;
var reMarker = function() {
    this._tokens = [];
    this._included = [];
    this._basePath = '';
    this._vars = {};
};
reMarker.prototype.startTag = '{';
reMarker.prototype.endTag = '}';
reMarker.prototype.setBasePath = function(basePath) {
    this._basePath = basePath;
    return this;
}
reMarker.prototype.setIncluded = function(val) {
    this._included.push(val);
    return this;
}
reMarker.prototype.getIncluded = function() {
    return this._included;
}
reMarker.prototype.parse = function(templ) {
    var TAG_REGEX = escapeRegExp(this.startTag) + '(?:\\s*)((?:[\\\/\\$])*[\\w\\*]+)(?:\\s*)(.*?)(?:\\1*)(?:\\s*)' + escapeRegExp(this.endTag);
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
}
reMarker.prototype.proc = function(templ, data) {
    var that = this,
        _complied;
    try {
        this._vars = data;
        var content = this.parse(templ);
        _complied = new Function('$data', '$util', content + ';return _out.join("");');
    } catch (ex) {
        throw new Error('模板解析出错' + ex.message);
    }
    if (!data) {
        return function($data) {
            var $util = that;
            return _complied($data, $util);
        };
    }
    //todo:以后要删除这段，这段方式没有{script}好
    var _html = _complied.call(this, data, this);
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
reMarker.prototype.value = function(variable) {
    if (toString.call(variable) === '[object Object]' || toString.call(variable) === '[object Array]') {
        return JSON.stringify(variable);
    } else {
        return variable;
    }
}
nc.reMarker = reMarker;