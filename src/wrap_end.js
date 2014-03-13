});
//如果内嵌入web页面,则自动将模板导出为JS变量
(function(factory) {
    if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
        var target = module['exports'] || exports;
        factory(target);
    } else if (typeof define === 'function' && define['amd']) {
        define(['exports'], factory);
    } else {
        var scriptTags = document.getElementsByTagName('script'),
            templates = [];
        for (var i = 0; i < scriptTags.length; i++) {
            if (scriptTags[i].getAttribute('type') == 'remark-template') {
                templates.push(scriptTags[i]);
            }
        }
        for (var t = 0; t < templates.length; t++) {
            var _id = '__' + templates[t].id + '__';
            window[_id] = new window.NC.reMarker().proc(templates[t].innerHTML);
        }
    }
})(function(exports) {});