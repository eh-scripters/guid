// ==UserScript==
// @name EH GUID Gallery Tag List
// @description Adds user tag check and tag group links to tools.php gid
// @match https://repo.e-hentai.org/tools.php*gid=*
// @match https://repo.e-hentai.org/tools/*gid=*
// @match https://repo.e-hentai.org/tools/tagapprove*
// @grant none
// @version 20240512
// ==/UserScript==
/*
@licstart

Copyright (C) 2016 Luna Flina <43883@e-hentai.org>

This work is free. You can redistribute it and/or modify it under the
terms of the Do What The Fuck You Want To Public License, Version 2,
as published by Sam Hocevar. See the COPYING file for more details.

@licend
*/

'use strict;';

(function () {
  const ownID = getCookie('ipb_member_id');
  const masterURL = '/tools/taggroup?mastertag=';
  const nsURL = '/tools/tagns?searchtag=';

  function addStyle(header, table) {
    if (table === undefined) {
      return;
    }

    const vetoUp = 'background-color:lightgreen; color:green; font-weight:bold;';
    const vetoDown = 'background-color:lightpink; color:red; font-weight:bold;';
    const scoreList = table.querySelectorAll('td:nth-of-type(1)');
    const userList = table.querySelectorAll('td:nth-of-type(2)');
    let totalScore = 0;

    for (let i = 0; i < scoreList.length; i++) {
      const href = userList[i].firstChild.href;
      const userID = /uid=(\w+)/.exec(href)[1];
      const score = parseInt(scoreList[i].textContent);
      const voteColor = userList[i].style.color;

      if (voteColor === 'rgb(255, 57, 57)') {
        userList[i].style = vetoDown;
      } else if (voteColor === 'rgb(0, 155, 0)') {
        userList[i].style = vetoUp;
      }

      if (userID == ownID) {
        userList[i].style.border = '5px solid';
      }

      totalScore += score;
    }

    const tagGroup = header.querySelector('td:nth-of-type(2)');
    const tagName = header.querySelector('td:nth-of-type(3)');

    const groupLink = document.createElement('a');
    groupLink.setAttribute('href', masterURL + tagGroup.firstChild.textContent);
    groupLink.textContent = ' [G] ';

    const nsLink = document.createElement('a');
    nsLink.setAttribute('href', nsURL + tagName.firstChild.textContent);
    nsLink.textContent = ' [NS]';

    const scoreText = document.createElement('span');
    scoreText.textContent = ' (' + totalScore + ')';
    scoreText.style.color = 'grey';
    scoreText.style.fontStyle = 'italic';

    tagName.appendChild(scoreText);
    tagName.insertBefore(groupLink, tagName.firstChild);
    tagName.insertBefore(nsLink, tagName.firstChild);
  }

  const tables = document.querySelectorAll('table:nth-of-type(1)');
  const tagHeader = [];
  const tagLists = [];

  for (let i = 0; i < tables.length; i += 3) {
    const tableCount = tables[i].parentElement.querySelectorAll('table').length;
    tagHeader.push(tables[i]);
    if (tableCount == 2) i--;
    tagLists.push(tables[i+2]);
  }

  for (let i = 0; i < tagLists.length; i++) {
    addStyle(tagHeader[i], tagLists[i]);
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }
})();

console.log('eh-guid-taglist-gid is active');
