// ==UserScript==
// @name         Tick internal by default
// @namespace    ehentai repo
// @version      0.0.1
// @description  Auto checks the send internal button
// @author       Shank
// @match        https://repo.e-hentai.org/tools/temptags?tagid=*
// @grant        none
// ==/UserScript==

document.getElementsByName('is_internal')[0].checked = true
