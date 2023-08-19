// ==UserScript==
// @name EH GUID Gallery Tag List
// @description Adds user tag check and tag group links to tools.php gid
// @match https://repo.e-hentai.org/tools.php*gid=*
// @match https://repo.e-hentai.org/tools/*gid=*
// @match https://repo.e-hentai.org/tools/tagapprove*
// @grant none
// @version 20230818
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
  var ownID = getCookie('ipb_member_id'); // (boobies) Replace this with your own user ID
  var adminACL = [ "6"        // Tenboro
                 , "25692"    // Angel
  ];
  var vetoACL = [ "4850902"   // Agoraphobia
                , "90092"     // Alpha 7
                , "2884"      // Beryl
                , "243587"    // Binglo
                , "924439"    // blue penguin
                , "631161"    // chaos-x
                , "1207129"   // Cipher-kun
                , "16353"     // Dammon
                , "409722"    // danixxx
                , "2115725"   // Deulkkae
                , "882044"    // DGze
                , "1908893"   // Dnkz
                , "2790"      // elgringo
                , "159384"    // etothex
                , "1028280"   // freudia
                , "971620"    // kitsuneH
                , "43883"     // Luna_Flina
                , "589675"    // Maximum_Joe
                , "204246"    // meow_pao
                , "317696"    // Miles Edgeworth
                , "1898816"   // Mrsuperhappy
                , "248946"    // MSimm1
                , "3169265"   // nasu
                , "68896"     // NoNameNoBlame
                , "106471"    // nonotan
                , "241107"    // ohmightycat
                , "892479"    // peterson123
                , "154972"    // pop9
                , "2610932"   // Rinnosuke M.
                , "989173"    // Shank
                , "2203"      // Spectre
                , "1647739"   // Superlatanium
                , "976341"    // svines85
                , "582527"    // TheGreyPanther
                , "301767"    // varst
  ];
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
    var adminUp = "background-color:gold; color:green; font-weight:bold;";
    var adminDown = "background-color:gold; color:red; font-weight:bold;";
    var vetoUp = "background-color:lightgreen; color:green; font-weight:bold;";
    var vetoDown = "background-color:lightpink; color:red; font-weight:bold;";
    var scoreList = table.querySelectorAll("td:nth-of-type(1)");
    var userList = table.querySelectorAll("td:nth-of-type(2)");
    var totalScore = 0;
    for (var i=0; i < scoreList.length; i++) {
      href = userList[i].firstChild.href;
      userID = /uid=(\w+)/.exec(href)[1];
      var score = parseInt(scoreList[i].textContent);

      if (adminACL.indexOf(userID) > -1) {
        if (score > 0)
          userList[i].style = adminUp;
        else
          userList[i].style = adminDown;
      } else if (vetoACL.indexOf(userID) > -1) {
        if (score > 0)
          userList[i].style = vetoUp;
        else
          userList[i].style = vetoDown;
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
    tagHeader.push(tables[i]);
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
