// ==UserScript==
// @name EH GUID New Tags
// @description Adds filters to tools.php newtags
// @match https://repo.e-hentai.org/tools.php*act=newtags*
// @match https://repo.e-hentai.org/tools/newtags*
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
  var script_uuid = "eh-guid-newtags";
  var masterURL = "/tools/taggroup?mastertag=";
  var nsURL = "/tools/tagns?searchtag=";

  function addCheckNode(nodeSel, idRegex, urlArg) {
    var baseToolsURL = "/tools/taglist?";
    var links = document.querySelectorAll(nodeSel);
    for (var i=0; i < links.length; i++) {
      var ugID = idRegex.exec(links[i]);
      if (!ugID)
        continue;

      ugID = ugID[1];
      var checkNode = document.createElement("a");
      checkNode.setAttribute("target", "_blank");
      var checkText = document.createTextNode("✔");
      checkNode.style.paddingRight = "5px";
      checkNode.appendChild(checkText);
      checkNode.setAttribute("href", baseToolsURL + urlArg + ugID);
      links[i].parentNode.insertBefore(checkNode, links[i]);
    }
  }

  function makeButtonPair(text, query, hideCallback, showCallback) {
    var showText = document.createTextNode("Show " + text);
    var hideText = document.createTextNode("Hide " + text);
    var showId = "show-" + text;
    var hideId = "hide-" + text;
    var showSpan = document.createElement("span");
    var hideSpan = document.createElement("span");
    showSpan.appendChild(showText);
    showSpan.setAttribute("id", showId);
    hideSpan.appendChild(hideText);
    hideSpan.setAttribute("id", hideId);
    showSpan.addEventListener("click", function() {
      for (var i=0; i < query.length; i++) {
        showCallback(query[i]);
      }
      showSpan.style.cursor = "text";
      showSpan.style.opacity = "0.3";
      showSpan.style.fontWeight = "normal";
      hideSpan.style.cursor = "pointer";
      hideSpan.style.opacity = "1";
      hideSpan.style.fontWeight = "bold";
      localStorage.setItem(script_uuid + "-" + showId, "show");
    });
    hideSpan.addEventListener("click", function() {
      for (var i=0; i < query.length; i++) {
        hideCallback(query[i]);
      }
      hideSpan.style.cursor = "text";
      hideSpan.style.opacity = "0.3";
      hideSpan.style.fontWeight = "normal";
      showSpan.style.cursor = "pointer";
      showSpan.style.opacity = "1";
      showSpan.style.fontWeight = "bold";
      localStorage.setItem(script_uuid + "-" + showId, "hide");
    });
    var span = document.createElement("span");
    hideSpan.style.cursor = "pointer";
    hideSpan.style.fontWeight = "bold";
    showSpan.style.opacity = "0.3";
    showSpan.style.fontWeight = "normal";
    span.appendChild(hideSpan);
    span.appendChild(showSpan);
    // button pair is close to each other and further away trom other spans
    showSpan.style.marginLeft = "0.5em";
    span.style.marginLeft = "3em";
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
    this.elem.style.display = "none";
    for (var i=0; i < this.votes.length; i++) {
      this.votes[i].style.display = "none";
    }
  }
  Tag.prototype.hideVotes = function() {
    this.showTagVotes = false;
    for (var i=0; i < this.votes.length; i++) {
      this.votes[i].style.display = "none";
    }
  }
  Tag.prototype.show = function() {
    this.showThis = true;
    this.elem.style.display = "table-row";
    if (!this.showTagVotes)
      return;
    for (var i=0; i < this.votes.length; i++) {
      this.votes[i].style.display = "table-row";
    }
  }
  Tag.prototype.showVotes = function() {
    this.showTagVotes = true;
    if (!this.showThis)
      return;
    for (var i=0; i < this.votes.length; i++) {
      this.votes[i].style.display = "table-row";
    }
  }
  Tag.prototype.isKlorpa = function() {
    if (this.votes.length < 3)
      return false;  // just in case
    var firstVote = this.votes[0];
    return firstVote.children[3].children[1].textContent == "klorpa";
  }

  addCheckNode("a[href*='showuser']", /showuser=(\w+)/, "uid=");
  addCheckNode("a[href*='/g/']", /\/g\/(\w+)/, "gid=");

  var tr = document.querySelectorAll("tr");
  var tags = [];
  var currTag = null;
  for (var i=0; i < tr.length; i++) {
    if (tr[i].children.length == 4) {
      tr[i].classList.add("tag_row");
      currTag = new Tag(tr[i], []);
      tags.push(currTag);
    }
    if (tr[i].children.length == 5) {
      tr[i].classList.add("vote_row");
      currTag.votes.push(tr[i]);
    }
    if (tr[i].children.length == 2) {
      tr[i].classList.add("vote_row");
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
    if ("B" == tr.children[0].textContent) {
      tr.classList.add("blacklisted");
      tr.style.backgroundColor = "lightpink";
      tr.style.color = "red";
      blacklisted.push(tags[i]);
    } else if ("S" == tr.children[1].textContent) {
      tr.classList.add("slaved");
      tr.style.backgroundColor = "gainsboro";
      tr.style.color = "grey";
      slaved.push(tags[i]);
    } else if (tagName.indexOf(":") > -1) {
      tr.classList.add("namespaced");
      tr.style.backgroundColor = "lightgreen";
      tr.style.color = "green";
      namespaced.push(tags[i]);
    } else {
      tr.classList.add("misc");
      tr.style.backgroundColor = "lightblue";
      tr.style.color = "blue";
      // populate extras instead
      if (tags[i].isKlorpa()) {
        tr.style.color = "navy";
        klorpa.push(tags[i]);
      } else {
        misc.push(tags[i]);
      }
    }
    var nsText = document.createTextNode(tagGroup);
    var nsLink = document.createElement("a");
    nsLink.setAttribute("target", "_blank");
    // tagGroup is the tagid so mere concatenation is harmless
    var url = masterURL+ tagGroup;
    nsLink.setAttribute("href", url);
    nsLink.appendChild(nsText);
    // do not use .firstElementChild, we need to replace the text itself
    tr.children[2].replaceChild(nsLink, tr.children[2].firstChild);

    nsText = document.createTextNode(tagName);
    nsLink = document.createElement("a");
    nsLink.setAttribute("target", "_blank");
    // just use %20 to encode all spaces, don't try to be clever with "+"
    url = nsURL + encodeURIComponent(tagName);
    nsLink.setAttribute("href", url);
    nsLink.appendChild(nsText);
    tr.children[3].replaceChild(nsLink, tr.children[3].firstChild);
  }

  var div = document.createElement("div");
  div.appendChild(makeButtonPair(
    "Votes", tags, h => h.hideVotes(), s => s.showVotes()));
  div.appendChild(makeButtonPair(
    "Blacklisted", blacklisted, h => h.hide(), s => s.show()));
  div.appendChild(makeButtonPair(
    "Slaved", slaved, h => h.hide(), s => s.show()));
  div.appendChild(makeButtonPair(
    "Namespaced", namespaced, h => h.hide(), s => s.show()));
  div.appendChild(makeButtonPair(
    "Misc", misc, h => h.hide(), s => s.show()));
  // extras
  div.appendChild(makeButtonPair(
    "klorpa", klorpa, h => h.hide(), s => s.show()));

  div.style.textAlign = "center";
  div.style.backgroundColor = "gainsboro";
  div.style.color = "black";
  div.style.position = "fixed";
  div.style.top = "0";
  div.style.width = "100%";
  // make space for the fixed div
  firstElement = document.body.firstElementChild;
  if (firstElement)  // just in case
    firstElement.style.marginTop = "1em";
  document.body.appendChild(div);

  var pageNum = 1;
  var pageSearch = /page=(-?\d+)/.exec(window.location.search);
  if (pageSearch)
    pageNum = Number(pageSearch[1]);

  var pnstyle = "position:fixed;background-color:gainsboro;padding:10px;";
  pnstyle += "font-size:12pt;border:1px solid lavender;top:2em;";
  pnstyle += "text-align:center;display:block;text-decoration:none;";
  pnstyle += "color:black;font-family:monospace;";
  var previous = document.createElement("a");
  previous.appendChild(document.createTextNode("previous"));
  previous.style = pnstyle;
  var next = document.createElement("a");
  next.appendChild(document.createTextNode("next"));
  next.style = pnstyle;

  next.style.borderRadius = "2px 50px 50px 2px / 2px 20px 20px 2px";
  previous.style.borderRadius = "50px 2px 2px 50px / 20px 2px 2px 20px";
  next.style.right = 0;
  next.style.paddingRight = "15px";
  previous.style.left = 0;
  previous.style.paddingLeft = "15px";
  var nextPage = "page=" + (pageNum + 1);
  var previousPage = "page=" + (pageNum - 1);
  var nURL, pURL;
  if (pageSearch) {
    nURL = window.location.href.replace("page=" + pageNum, nextPage);
    pURL = window.location.href.replace("page=" + pageNum, previousPage);
  } else {
      if(window.location.href.includes('?')) {
        nURL = window.location.href + "&" + nextPage;
        pURL = window.location.href + "&" + previousPage;
      } else {
        nURL = window.location.href + "?" + nextPage;
        pURL = window.location.href + "?" + previousPage;
      }
  }
  next.setAttribute("href", nURL);
  previous.setAttribute("href", pURL);
  document.body.appendChild(next);
  document.body.appendChild(previous);

  // state memory
  var stateVotes = localStorage.getItem(script_uuid + "-show-Votes");
  if ("hide" === stateVotes)
    document.getElementById("hide-Votes").click();
  var stateBlack = localStorage.getItem(script_uuid + "-show-Blacklisted");
  if ("hide" === stateBlack)
    document.getElementById("hide-Blacklisted").click();
  var stateSlaved = localStorage.getItem(script_uuid + "-show-Slaved");
  if ("hide" === stateSlaved)
    document.getElementById("hide-Slaved").click();
  var stateName = localStorage.getItem(script_uuid + "-show-Namespaced");
  if ("hide" === stateName)
    document.getElementById("hide-Namespaced").click();
  var stateMisc = localStorage.getItem(script_uuid + "-show-Misc");
  if ("hide" === stateMisc)
    document.getElementById("hide-Misc").click();
  var stateKlorpa = localStorage.getItem(script_uuid + "-show-klorpa");
  if ("hide" === stateKlorpa)
    document.getElementById("hide-klorpa").click();
})();

console.log("eh-guid-newtags is active");

