// ==UserScript==
// @name EH GUID New Tags
// @description EH GUID New Tags
// @match https://e-hentai.org/tools.php*act=newtags*
// @match http://e-hentai.org/tools.php*act=newtags*
// @match https://repo.e-hentai.org/tools.php*act=newtags*
// @match http://repo.e-hentai.org/tools.php*act=newtags*
// @grant none
// @version 20200209
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

function makeButtonPair(text, query, hideCallback, showCallback) {
  var showText = document.createTextNode('Show ' + text);
  var hideText = document.createTextNode('Hide ' + text);
  var showSpan = document.createElement('span');
  var hideSpan = document.createElement('span');
  showSpan.appendChild(showText);
  hideSpan.appendChild(hideText);
  showSpan.addEventListener('click', function() {
    for (var i=0; i < query.length; i++) {
      showCallback(query[i]);
    }
    showSpan.style.cursor = 'text';
    showSpan.style.opacity = '0.3';
    hideSpan.style.cursor = 'pointer';
    hideSpan.style.opacity = '1';
  });
  hideSpan.addEventListener('click', function() {
    for (var i=0; i < query.length; i++) {
      hideCallback(query[i]);
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

function Tag(elem, votes) {
  this.elem = elem;
  this.showThis = true;
  this.votes = votes;
  this.showTagVotes = true;
}
Tag.prototype.hide = function() {
  this.showThis = false;
  this.elem.style.display = 'none';
  for (var i=0; i < this.votes.length; i++) {
    this.votes[i].style.display = 'none';
  }
}
Tag.prototype.hideVotes = function() {
  this.showTagVotes = false;
  for (var i=0; i < this.votes.length; i++) {
    this.votes[i].style.display = 'none';
  }
}
Tag.prototype.show = function() {
  this.showThis = true;
  this.elem.style.display = 'table-row';
  if (!this.showTagVotes)
    return;
  for (var i=0; i < this.votes.length; i++) {
    this.votes[i].style.display = 'table-row';
  }
}
Tag.prototype.showVotes = function() {
  this.showTagVotes = true;
  if (!this.showThis)
    return;
  for (var i=0; i < this.votes.length; i++) {
    this.votes[i].style.display = 'table-row';
  }
}
Tag.prototype.isKlorpa = function() {
  if (!this.votes.length)
    return false;  // just in case
  var firstVote = this.votes[0];
  return firstVote.children[3].children[1].textContent == 'klorpa';
}

function init() {
  addCheckNode('a[href*="showuser"]', /showuser=(\w+)/, 'uid=');
  addCheckNode('a[href*="/g/"]', /\/g\/(\w+)/, 'gid=');

  var tr = document.querySelectorAll('tr');
  var tags = [];
  var currTag = null;
  for (var i=0; i < tr.length; i++) {
    if (tr[i].children.length == 4) {
      tr[i].classList.add('tag_row');
      currTag = new Tag(tr[i], []);
      tags.push(currTag);
    }
    if (tr[i].children.length == 5) {
      tr[i].classList.add('vote_row');
      currTag.votes.push(tr[i]);
    }
  }

  var blacklisted = [];
  var slaved = [];
  var namespaced = [];
  var misc = [];
  // extras
  var klorpa = [];
  for (var i=0; i < tags.length; i++) {
    var tr = tags[i].elem;
    var tagGroup = tr.children[2].textContent;
    var tagName = tr.children[3].textContent;
    if ('B' == tr.children[0].textContent) {
      tr.classList.add('blacklisted');
      tr.style.backgroundColor = 'lightpink';
      tr.style.color = 'red';
      blacklisted.push(tags[i]);
    } else if ('S' == tr.children[1].textContent) {
      tr.classList.add('slaved');
      tr.style.backgroundColor = 'gainsboro';
      tr.style.color = 'grey';
      slaved.push(tags[i]);
    } else if (tagName.indexOf(':') > -1) {
      tr.classList.add('namespaced');
      tr.style.backgroundColor = 'lightgreen';
      tr.style.color = 'green';
      namespaced.push(tags[i]);
    } else {
      tr.classList.add('misc');
      tr.style.backgroundColor = 'lightblue';
      tr.style.color = 'blue';
      // populate extras instead
      if (tags[i].isKlorpa()) {
        tr.style.color = 'navy';
        klorpa.push(tags[i]);
      } else {
        misc.push(tags[i]);
      }
    }
    var nsText = document.createTextNode(tagGroup);
    var nsLink = document.createElement('a');
    nsLink.setAttribute('target', '_blank');
    // tagGroup is the tagid so mere concatenation is harmless
    var url = '/tools.php?act=taggroup&mastertag=' + tagGroup;
    nsLink.setAttribute('href', url);
    nsLink.appendChild(nsText);
    // do not use .firstElementChild, we need to replace the text itself
    tr.children[2].replaceChild(nsLink, tr.children[2].firstChild);

    nsText = document.createTextNode(tagName);
    nsLink = document.createElement('a');
    nsLink.setAttribute('target', '_blank');
    // just use %20 to encode all spaces, don't try to be clever with '+'
    url = '/tools.php?act=tagns&searchtag=' + encodeURIComponent(tagName);
    nsLink.setAttribute('href', url);
    nsLink.appendChild(nsText);
    tr.children[3].replaceChild(nsLink, tr.children[3].firstChild);
  }

  var div = document.createElement('div');
  div.appendChild(makeButtonPair(
    'Votes', tags, h => h.hideVotes(), s => s.showVotes()));
  div.appendChild(makeButtonPair(
    'Blacklisted', blacklisted, h => h.hide(), s => s.show()));
  div.appendChild(makeButtonPair(
    'Slaved', slaved, h => h.hide(), s => s.show()));
  div.appendChild(makeButtonPair(
    'Namespaced', namespaced, h => h.hide(), s => s.show()));
  div.appendChild(makeButtonPair(
    'Misc', misc, h => h.hide(), s => s.show()));
  // extras
  div.appendChild(makeButtonPair(
    'klorpa', klorpa, h => h.hide(), s => s.show()));

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

