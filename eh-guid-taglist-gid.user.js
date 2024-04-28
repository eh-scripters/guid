// ==UserScript==
// @name EH GUID Gallery Tag List
// @description Adds user tag check and tag group links to tools.php gid
// @match https://repo.e-hentai.org/tools.php*gid=*
// @match https://repo.e-hentai.org/tools/*gid=*
// @match https://repo.e-hentai.org/tools/tagapprove*
// @grant none
// @version 20240428
// ==/UserScript==
/*
@licstart

Copyright (C) 2016 Luna Flina <43883@e-hentai.org>

This work is free. You can redistribute it and/or modify it under the
terms of the Do What The Fuck You Want To Public License, Version 2,
as published by Sam Hocevar. See the COPYING file for more details.

@licend
*/

"use strict;";

(function() {
  var ownID = getCookie('ipb_member_id');
  var masterURL = "/tools/taggroup?mastertag=";

  function addCheckNode(linkNode) {
    var baseToolsURL = "/tools/taglist?";
    var userID = /showuser=(\w+)/.exec(linkNode);
    if (!userID)  // just in case, sometimes it is needed
      return;

    userID = userID[1]
    var checkNode = document.createElement("a");
    checkNode.setAttribute("target", "_blank");
    var checkText = document.createTextNode("✔");
    checkNode.style = "padding-right:5px;";
    checkNode.appendChild(checkText);
    checkNode.setAttribute("href", baseToolsURL + "uid=" + userID);
    linkNode.parentNode.insertBefore(checkNode, linkNode);
  }

  function addStyle(header, table) {
    if(table === undefined) {
        return;
    }
    var vetoUp = "background-color:lightgreen; color:green; font-weight:bold;";
    var vetoDown = "background-color:lightpink; color:red; font-weight:bold;";
    var scoreList = table.querySelectorAll("td:nth-of-type(1)");
    var userList = table.querySelectorAll("td:nth-of-type(2)");
    var totalScore = 0;
    for (var i=0; i < scoreList.length; i++) {
      href = userList[i].firstChild.href;
      userID = /uid=(\w+)/.exec(href)[1];
      var score = parseInt(scoreList[i].textContent);
      var voteColor = userList[i].style.color;

      if (voteColor == 'rgb(255, 57, 57)') {
        userList[i].style = vetoDown;
      } else if (voteColor == 'rgb(0, 155, 0)') {
        userList[i].style = vetoUp;
      }

      if (userID == ownID)
        userList[i].style.border = "5px solid";

      totalScore += score;
    }
    tagGroup = header.querySelector("td:nth-of-type(2)");
    var textNode = tagGroup.firstChild;
    var anchor = document.createElement("a");
    anchor.setAttribute("href", masterURL + textNode.textContent);
    anchor.setAttribute("target", "_blank");
    tagGroup.replaceChild(anchor, textNode);
    anchor.appendChild(textNode);

    tagName = header.querySelector("td:nth-of-type(3)");
    var scoreText = document.createTextNode(" (" + totalScore + ")");
    tagName.appendChild(scoreText);
  }

  var links = document.querySelectorAll("a[href*='showuser']");
  for (var i=0; i < links.length; i++)
    addCheckNode(links[i]);

  var tables = document.querySelectorAll("table:nth-of-type(1)");
  var tagHeader = [];
  var tagLists = [];
  for (var i=0; i < tables.length; i+=3) {
    var tableCount = tables[i].parentElement.querySelectorAll("table").length;
    tagHeader.push(tables[i]);
    if (tableCount == 2) i--;
    tagLists.push(tables[i+2]);
  }

  for (var i=0; i < tagLists.length; i++)
    addStyle(tagHeader[i], tagLists[i]);

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }
})();

console.log("eh-guid-taglist-gid is active");
