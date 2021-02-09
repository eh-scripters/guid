// ==UserScript==
// @name         Tag Check Links
// @version      0.2.0
// @description  Add shortcut link(s) to tag checking pages via galleries
// @author       nasu_sensei
// @match        https://e-hentai.org/g/*
// @match        https://exhentai.org/g/*
// @grant        none
// ==/UserScript==

"use strict;";
(function () {
  var galleryID = window.location.href.split('/')[4];
  var tagMenu = document.querySelector('#tagmenu_new');
  var baseToolsURL = 'https://repo.e-hentai.org/tools.php?act=taglist&';

  var checkNode = document.createElement('a');
  checkNode.setAttribute('target', '_blank');
  var checkText = document.createTextNode('✔');
  checkNode.style = 'position:absolute;bottom:10px;right:19.5%;';
  checkNode.style += 'font-weight:bold;font-size:14pt;text-decoration:none';
  checkNode.appendChild(checkText);
  checkNode.setAttribute('href', baseToolsURL + 'gid=' + galleryID);
  tagMenu.parentNode.insertBefore(checkNode, tagMenu);
})();

