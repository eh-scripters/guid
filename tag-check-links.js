// ==UserScript==
// @name         Tag Check Links
// @version      0.1.3
// @description  Add shortcut link(s) to tag checking pages via galleries
// @author       nasu_sensei
// @match        https://e-hentai.org/g/*
// @match        https://exhentai.org/g/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js
// ==/UserScript==
 
(function() {
    $(document).ready(function() {
        var gid = window.location.href.split('/')[4];
        var url = "https://e-hentai.org/tools.php?act=taglist&gid=" + gid;
 
        $('#gmid #gd4').append('<a target="_blank" style="position:absolute;bottom:10px;right:19.5%;font-weight:bold;text-decoration:none" href="' + url + '">check</a>');
    });
})();

