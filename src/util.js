function escapeRegExp(string) {
    return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
}

/**
 * 移除不安全代码
 * @param html
 * @returns {*|void}
 */
function removeUnsafe(html) {
    var _templ = html.replace(/([\r\n])/ig, '\\n').replace(/\s{2,}/ig, ' ').replace(/\'/ig, "\\\'");
    return _templ;
}

function phpToJSVar(v, needRemove) {
    return v.replace(/\$(([a-zA-Z_][a-zA-Z0-9_]*))(\.\[)*/ig, function($0, $1) {
        return $1;
    })
}

/**
 * 实现PHP strftime
 * @param format 日期格式化
 * @returns {string} 格式化后的日期
 */
var strftime = (function() {
    function strftime(date, format) {
        return (format + "").replace(/%([a-zA-Z ])/g,
            function(m, f) {
                var formatter = formats && formats[f];

                if (typeof formatter == "function") {
                    return formatter.call(formats, date);
                } else if (typeof formatter == "string") {
                    return strftime(formatter);
                }
                return f;
            });
    }

    //Internal helper
    function zeroPad(num) {
        return (+num < 10 ? "0" : "") + num;
    }

    var formats = {
        //Formatting methods
        d: function(date) {
            return zeroPad(date.getDate());
        },

        m: function(date) {
            return zeroPad(date.getMonth() + 1);
        },

        y: function(date) {
            return date.getYear() % 100;
        },

        Y: function(date) {
            return date.getFullYear();
        },

        //Format shorthands
        F: "%Y-%m-%d",
        D: "%m/%d/%y"
    };
    return strftime;
}());

/**
 * 实现PHP数字格式化
 * number_format(1234.56);
 * number_format(1234.56, 2, ',', ' ')
 * number_format(1000)
 * number_format('1 000,50', 2, '.', ' ')
 * @param number
 * @param decimals
 * @param dec_point
 * @param thousands_sep
 * @returns {string}
 * @reference http://phpjs.org/functions/number_format/
 */
function number_format(number, decimals, dec_point, thousands_sep) {
    number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
    var n = !isFinite(+number) ? 0 : +number,
        prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
        sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
        dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
        s = '',
        toFixedFix = function(n, prec) {
            var k = Math.pow(10, prec);
            return '' + Math.round(n * k) / k;
        };
    // Fix for IE parseFloat(0.55).toFixed(0) = 0;
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
}