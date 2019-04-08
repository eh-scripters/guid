// ==UserScript==
// @name EH GUID New Tags
// @description EH GUID New Tags
// @match https://e-hentai.org/tools.php*act=newtags*
// @match http://e-hentai.org/tools.php*act=newtags*
// @grant none
// @version 20190408
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
// If you use anchors for namespacing replace the URL below with the forum link
var NSURL = 'https://forums.e-hentai.org/index.php?showtopic=199295&st=999999';

function addCheckNode(nodeSel, idRegex, urlArg) {
  var baseToolsURL = '/tools.php?act=taglist&';
  var links = document.querySelectorAll(nodeSel);
  for (var i=0; i < links.length; i++) {
    var ugID = idRegex.exec(links[i]);
    if (!ugID)
      continue;

    ugID = ugID[1];
    var checkNode = document.createElement('a');
    checkNode.setAttribute('target', '_blank');
    var checkText = document.createTextNode('✔');
    checkNode.style.paddingRight = '5px';
    checkNode.appendChild(checkText);
    checkNode.setAttribute('href', baseToolsURL + urlArg + ugID);
    links[i].parentNode.insertBefore(checkNode, links[i]);
  }
}

function makeButtonPair(text, query) {
  var showText = document.createTextNode('Show ' + text);
  var hideText = document.createTextNode('Hide ' + text);
  var showSpan = document.createElement('span');
  var hideSpan = document.createElement('span');
  showSpan.appendChild(showText);
  hideSpan.appendChild(hideText);
  showSpan.addEventListener('click', function() {
    for (var i=0; i < query.length; i++) {
      query[i].style.display = 'table-row';
    }
    showSpan.style.cursor = 'text';
    showSpan.style.opacity = '0.3';
    hideSpan.style.cursor = 'pointer';
    hideSpan.style.opacity = '1';
  });
  hideSpan.addEventListener('click', function() {
    for (var i=0; i < query.length; i++) {
      query[i].style.display = 'none';
    }
    hideSpan.style.cursor = 'text';
    hideSpan.style.opacity = '0.3';
    showSpan.style.cursor = 'pointer';
    showSpan.style.opacity = '1';
  });
  var span = document.createElement('span');
  hideSpan.style.cursor = 'pointer';
  showSpan.style.opacity = '0.3';
  span.appendChild(hideSpan);
  span.appendChild(showSpan);
  // button pair is close to each other and further away trom other spans
  showSpan.style.marginLeft = '0.5em';
  span.style.marginLeft = '3em';
  return span;
}

function init() {
  addCheckNode('a[href*="showuser"]', /showuser=(\w+)/, 'uid=');
  addCheckNode('a[href*="/g/"]', /\/g\/(\w+)/, 'gid=');

  var tr = document.querySelectorAll('tr');
  for (var i=0; i < tr.length; i++) {
    if (tr[i].children.length == 4) {
      tr[i].classList.add('tag_row');
    }
    if (tr[i].children.length == 5) {
      tr[i].classList.add('vote_row');
    }
  }

  var tags = document.querySelectorAll('.tag_row');
  for (var i=0; i < tags.length; i++) {
    var tagGroup = tags[i].children[2].textContent;
    var tagName = tags[i].children[3].textContent;
    if ('B' == tags[i].children[0].textContent) {
      tags[i].classList.add('blacklisted');
      tags[i].style.backgroundColor = 'lightpink';
      tags[i].style.color = 'red';
    } else if ('S' == tags[i].children[1].textContent) {
      tags[i].classList.add('slaved');
      tags[i].style.backgroundColor = 'gainsboro';
      tags[i].style.color = 'grey';
    } else if (tagName.indexOf(':') > -1) {
      tags[i].classList.add('namespaced');
      tags[i].style.backgroundColor = 'lightgreen';
      tags[i].style.color = 'green';
    } else {
      tags[i].classList.add('misc');
      tags[i].style.backgroundColor = 'lightblue';
      tags[i].style.color = 'blue';
    }
    var nsText = document.createTextNode(tagGroup);
    var nsLink = document.createElement('a');
    nsLink.setAttribute('target', '_blank');
    // tagGroup is the tagid so mere concatenation is harmless
    var url = '/tools.php?act=taggroup&mastertag=' + tagGroup;
    nsLink.setAttribute('href', url);
    nsLink.appendChild(nsText);
    // do not use .firstElementChild, we need to replace the text itself
    tags[i].children[2].replaceChild(nsLink, tags[i].children[2].firstChild);
    
    var nsText = document.createTextNode(tagName);
    var nsLink = document.createElement('a');
    nsLink.setAttribute('target', '_blank');
    // just use %20 to encode all spaces, don't try to be clever with '+'
    var url = '/tools.php?act=tagns&searchtag=' + encodeURIComponent(tagName);
    nsLink.setAttribute('href', url);
    nsLink.appendChild(nsText);
    tags[i].children[3].replaceChild(nsLink, tags[i].children[3].firstChild);
  }

  var div = document.createElement('div');
  div.appendChild(makeButtonPair(
    'Votes', document.querySelectorAll('.vote_row')));
  div.appendChild(makeButtonPair(
    'Blacklisted', document.querySelectorAll('.blacklisted')));
  div.appendChild(makeButtonPair(
    'Slaved', document.querySelectorAll('.slaved')));
  div.appendChild(makeButtonPair(
    'Namespaced', document.querySelectorAll('.namespaced')));
  div.appendChild(makeButtonPair(
    'Misc', document.querySelectorAll('.misc')));

  div.style.textAlign = 'center';
  div.style.backgroundColor = 'gainsboro';
  div.style.position = 'fixed';
  div.style.top = '0';
  div.style.width = '100%';
  // make space for the fixed div
  firstElement = document.body.firstElementChild;
  firstElement.style.marginTop = '1em';
  document.body.insertBefore(div, firstElement);
}

init();

