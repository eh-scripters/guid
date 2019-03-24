// ==UserScript==
// @name EH GUID New Tags
// @description EH GUID New Tags
// @match https://e-hentai.org/tools.php*act=newtags*
// @match http://e-hentai.org/tools.php*act=newtags*
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
// If you use anchors for namespacing replace the URL below with the forum link
var NSURL = "https://forums.e-hentai.org/index.php?showtopic=88776&st=9999999"

function addCheckNode(linkNode) {
  var baseToolsURL = "/tools.php?act=taglist&";
  var userID = /showuser=(\w+)/.exec(linkNode);
  var galleryID = /\/g\/(\w+)/.exec(linkNode);

  if (!userID && !galleryID)
    return;

  var checkNode = document.createElement("a");
  var checkText = document.createTextNode("✔");
  checkNode.style = "padding-right:5px";
  checkNode.appendChild(checkText);

  if (!!userID)
    checkNode.setAttribute("href", baseToolsURL + "uid=" + userID[1]);
  else
    checkNode.setAttribute("href", baseToolsURL + "gid=" + galleryID[1]);

  linkNode.parentNode.insertBefore(checkNode, linkNode);
}

function toggleVotes() {
  form.tv.value = -form.tv.value;
  form.submit();
}

function init() {
  var selectors = "a[href*='showuser'], a[href*='/g/']:not([onclick]), p.g2 > a";
  var links = document.querySelectorAll(selectors);
  var loc = window.location.href;

  for (var i = 0; i < links.length; i++)
    addCheckNode(links[i]);

  var a = document.createElement("a");
  var div = document.createElement("div");

  var form = document.createElement("form");
  form.method = "GET";

  var actTools = document.createElement("input");
  actTools.name = "act";
  actTools.type = "hidden";
  actTools.value = "newtags";

  var checkM = document.createElement("input");
  checkM.name = "hm";
  checkM.type = "checkbox";
  checkM.checked = (loc.indexOf("hm=on") > 0);

  var labelM = document.createElement("label");
  labelM.htmlFor = "hm";
  labelM.textContent = "Hide misc";

  var checkB = document.createElement("input");
  checkB.name = "hb";
  checkB.type = "checkbox";
  checkB.checked = (loc.indexOf("hb=on") > 0);

  var labelB = document.createElement("label");
  labelB.htmlFor = "hb";
  labelB.textContent = "Hide blocked";

  var checkS = document.createElement("input");
  checkS.name = "hs";
  checkS.type = "checkbox";
  checkS.checked = (loc.indexOf("hs=on") > 0);

  var labelS = document.createElement("label");
  labelS.htmlFor = "hs";
  labelS.textContent = "Hide slaved";

  var checkNS = document.createElement("input");
  checkNS.name = "hns";
  checkNS.type = "checkbox";
  checkNS.checked = (loc.indexOf("hns=on") > 0);

  var labelNS = document.createElement("label");
  labelNS.htmlFor = "hns";
  labelNS.textContent = "Hide namespaced";

  var toggleButton = document.createElement("button");

  toggleButton.name = "tv";
  toggleButton.textContent = "Toggle votes";
  toggleButton.style = "margin-left:10px";
  toggleButton.value = (loc.indexOf("tv=-1") > 0) ? -1 : 1;
  toggleButton.onclick = function() { toggleVotes(); };

  var submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.textContent = "Set";
  submitButton.style = "margin-left:10px";

  div.style.textAlign = "center";
  div.style.backgroundColor = "gainsboro";

  a.setAttribute("href", NSURL);
  a.textContent = "Tag grouping and namespacing thread";
  a.style.fontWeight = "bold";

  div.appendChild(a);
  form.appendChild(actTools);
  form.appendChild(checkM);
  form.appendChild(labelM);
  form.appendChild(checkB);
  form.appendChild(labelB);
  form.appendChild(checkS);
  form.appendChild(labelS);
  form.appendChild(checkNS);
  form.appendChild(labelNS);
  form.appendChild(toggleButton);
  form.appendChild(submitButton);
  div.appendChild(form);

  if (!form.tv.value)
    form.tv.value = 1;

  document.body.insertBefore(div, document.body.firstElementChild);

  var tr = document.querySelectorAll("tr");
  var tagStatus = "";

  for (var i=0; i<tr.length; i++)
  {
    if (!!tr[i-1])
      tr[i].id = tr[i-1].id;

    if (tr[i].children.length == 3)
      {
        var tagName = tr[i].children[2].textContent;

        tr[i].children[2].innerHTML = "<a href="+
          encodeURI("http://g.e-hentai.org/tools.php?act=tagns&searchtag="+
          tagName.replace(/\s/g,'+'))+'>'+tagName+"</a>";

        tr[i].className = "tag";
        tagStatus = tr[i].children[0].textContent;

        if (tagStatus == "-")
          tagStatus = tr[i].children[1].textContent;

        if (tagStatus == "-")
          if (tagName.indexOf(":") > -1)
            tagStatus = "NS";

        switch (tagStatus)
          {
            case "B":
              tr[i].id = "b";

              if (form.hb.checked)
                tr[i].style = "display:none";

              else
              {
                tr[i].style.backgroundColor = "lightpink";
                tr[i].style.color = "red";
              }

              break;

            case "S":
              tr[i].id = "s";

              if (form.hs.checked)
                tr[i].style = "display:none";

              else
              {
                tr[i].style.backgroundColor = "gainsboro";
                tr[i].style.color = "grey";
              }

              break;

            case "NS":
              tr[i].id = "ns";

              if (form.hns.checked)
                tr[i].style = "display:none";

              else
              {
                tr[i].style.backgroundColor = "lightgreen";
                tr[i].style.color = "green";
              }

              break;

            default:
              tr[i].id = "m";

              if (form.hm.checked)
                tr[i].style = "display:none";

              else
                {
                  tr[i].style.backgroundColor = "lightblue";
                  tr[i].style.color = "blue";
                }

              break;
          }
      }
  }

  var selector = "none";

  if (form.tv.value < 0)
    selector += ",tr:not(.tag)";
  if (form.hb.checked)
    selector += ",tr#b";
  if (form.hs.checked)
    selector += ",tr#s";
  if (form.hns.checked)
    selector += ",tr#ns";
  if (form.hm.checked)
    selector += ",tr#m";

  var tagVotes = document.querySelectorAll(selector);

  for (var i = 0; i < tagVotes.length; i++)
    tagVotes[i].style = "display:none";
}

init();

