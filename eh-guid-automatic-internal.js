// ==UserScript==
// @name         Tick internal by default
// @namespace    e-hentai repo
// @version      0.0.1
// @description  Auto checks the send internal button
// @author       Shank
// @match        https://repo.e-hentai.org/tools.php?act=temptags&tagid=*
// @grant        none
// ==/UserScript==

document.getElementsByName('is_internal')[0].checked = true
