// ==UserScript==
// @name EH GUID User Tag List
// @description Adds gallery check links and some user stats to taglist uid
// @match https://repo.e-hentai.org/tools.php*uid=*
// @match http://repo.e-hentai.org/tools.php*uid=*
// @grant none
// @version 20210605
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
  function addCheckNode(linkNode) {
    var baseToolsURL = "/tools.php?act=taglist&";
    var galleryID = /\/g\/(\w+)\//.exec(linkNode);
    if (!galleryID)  // just in case, sometimes it is needed
      return;

    galleryID = galleryID[1];
    var checkNode = document.createElement("a");
    checkNode.setAttribute("target", "_blank");
    var checkText = document.createTextNode("✔");
    checkNode.style = "padding-right:5px;";
    checkNode.appendChild(checkText);
    checkNode.setAttribute("href", baseToolsURL + "gid=" + galleryID);
    linkNode.parentNode.insertBefore(checkNode, linkNode);
  }

  var links = document.querySelectorAll("a[href*='/g/']");
  for (var i=0; i < links.length; i++)
    addCheckNode(links[i]);

  var aDiv = document.querySelector("div:nth-child(2)");
  var accText = aDiv.textContent;
  var accStarted = /Started Accuracy = (\w+)%/.exec(accText)[1];
  var accVoted = /Voted Accuracy = (\w+)%/.exec(accText)[1];
  var badStarted = parseFloat(accStarted) < 80;
  var badVoted = parseFloat(accVoted) < 90;

  if ((badStarted) || (badVoted))
    aDiv.style.color = "red";

  var stamps = document.querySelectorAll("td:nth-of-type(5)");
  if (stamps.length < 1) {
    var pElem = document.createElement("p");
    var sElem = document.createElement("strong");
    var sText = document.createTextNode("No tagging over the last 30 days");
    sElem.appendChild(sText);
    pElem.appendChild(sElem)
    aDiv.appendChild(pElem);
    return;
  }

  var oldestTag = stamps[stamps.length-1].textContent.replace(" ","T") + "Z";
  var dateDiff = new Date(Date.now() - new Date(oldestTag));

  var days = dateDiff.getUTCDate() - 1;
  var hours = dateDiff.getUTCHours();
  var minutes = dateDiff.getUTCMinutes();

  var activeDays = "";
  activeDays += (days > 0) ? days + " days " : "";
  activeDays += (hours > 0) ? hours + " hours " : "";
  activeDays += (minutes > 0) ? minutes + " minutes" : "";

  var pElem = document.createElement("p");
  var pText = document.createTextNode("History: ");
  pElem.appendChild(pText);
  var sElem = document.createElement("strong");
  var sText = document.createTextNode(
    stamps.length + "/1000 tags over the last "+ activeDays);
  sElem.appendChild(sText);
  pElem.appendChild(sElem);
  aDiv.appendChild(pElem);
})();

console.log("eh-guid-taglist-uid is active");

