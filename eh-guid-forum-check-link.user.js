// ==UserScript==
// @name         Forum User Check Links
// @version      0.1.1
// @description  Add shortcut link(s) to tag checking pages via forum profile
// @author       nasu_sensei
// @match        https://forums.e-hentai.org/index.php?showuser=*
// @grant        none
// ==/UserScript==

"use strict;";

(function () {
  var uid;
  var searchParams = new URLSearchParams(window.location.search);

  if (searchParams.has('showuser')) {
    uid = searchParams.get('showuser');
  }

  var usernameElement = document.getElementById('profilename').children[0];
  usernameElement.innerHTML += '<small><a target="_blank" style="text-decoration:none" href="https://repo.e-hentai.org/tools/taglist?uid=' + uid + '"> ✔</small>';
})();

console.log("eh-guid-forum-user-check-link is active");

