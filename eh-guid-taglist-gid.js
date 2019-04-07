// ==UserScript==
// @name EH GUID Gallery Tag List
// @description EH GUID Gallery Tag List
// @match https://e-hentai.org/tools.php*gid=*
// @match http://e-hentai.org/tools.php*gid=*
// @grant none
// @version 20190323
// ==/UserScript==
/*
@licstart

Copyright (C) 2016 Luna Flina <43883@e-hentai.org>

This work is free. You can redistribute it and/or modify it under the
terms of the Do What The Fuck You Want To Public License, Version 2,
as published by Sam Hocevar. See the COPYING file for more details.

@licend
*/

"use strict;"
var ownID = '5319009'; // (boobies) Replace this with your own user ID
var adminACL = [ '6'        // Tenboro
               , '25692'    // Angel
];
var vetoACL = [ '68896'     // 3d0xp0xy
              , '90092'     // Alpha 7
              , '243587'    // binglo
              , '924439'    // blue penguin
              , '631161'    // chaos-x
              , '16353'     // Dammon
              , '409722'    // danixxx
              , '2790'      // elgringo
              , '159384'    // etothex
              , '1028280'   // freudia
              , '971620'    // kitsuneH
              , '43883'     // Luna_Flina
              , '589675'    // Maximum_Joe
              , '1898816'   // Mrsuperhappy
              , '106471'    // nonotan
              , '241107'    // ohmightycat
              , '154972'    // pop9
              , '176159'    // Rikis
              , '2610932'   // Rinnosuke M.
              , '2203'      // Spectre
              , '1647739'   // Superlatanium
              , '976341'    // svines85
              , '582527'    // TheGreyPanther
              , '301767'    // varst
];

function addCheckNode(linkNode) {
  var baseToolsURL = '/tools.php?act=taglist&';
  var userID = /showuser=(\w+)/.exec(linkNode);
  if (!userID)
    return;

  userID = userID[1]
  var checkNode = document.createElement('a');
  checkNode.setAttribute('target', '_blank');
  var checkText = document.createTextNode('✔');
  checkNode.style = 'padding-right:5px';
  checkNode.appendChild(checkText);
  checkNode.setAttribute('href', baseToolsURL + 'uid=' + userID);
  linkNode.parentNode.insertBefore(checkNode, linkNode);
}

function addStyle(header, table) {
  var adminUp = 'background-color:gold; color:green; font-weight:bold';
  var adminDown = 'background-color:gold; color:red; font-weight:bold';
  var vetoUp = 'background-color:lightgreen; color:green; font-weight:bold';
  var vetoDown = 'background-color:lightpink; color:red; font-weight:bold';
  var scoreList = table.querySelectorAll('td:nth-of-type(1)');
  var userList = table.querySelectorAll('td:nth-of-type(2)');
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
      userList[i].style.border = '5px solid';

    totalScore += score;
  }
  tagGroup = header.querySelector('td:nth-of-type(2)');
  tagGroup.innerHTML = '<a href="/tools.php?act=taggroup&mastertag='
  +tagGroup.textContent+'">'+tagGroup.textContent+'</a>';

  tagName = header.querySelector('td:nth-of-type(3)');
  var scoreText = document.createTextNode(' (' + totalScore + ')');
  tagName.appendChild(scoreText);
}

function init() {
  var links = document.querySelectorAll('a[href*="showuser"]');
  for (var i=0; i < links.length; i++)
    addCheckNode(links[i]);

  var tables = document.querySelectorAll('table:nth-of-type(1)');
  var tagHeader = [];
  var tagLists = [];
  for (var i=0; i < tables.length; i+=3) {
    tagHeader.push(tables[i]);
    tagLists.push(tables[i+2]);
  }

  for (var i=0; i < tagLists.length; i++)
    addStyle(tagHeader[i], tagLists[i]);
}

init();

