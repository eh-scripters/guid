// ==UserScript==
// @name        EH G.U.I.D. Project
// @description User taglist, gallery taglist and namespacing tools
// @match       https://e-hentai.org/tools.php*
// @match       http://e-hentai.org/tools.php*
// @grant       none
// @version     20170122
// ==/UserScript==
/*
@usage_start

# Features (TODO this can be improved)

Namespacing and checking moderators:

-   G.U.I.D. Project (for NS and checking moderators)

All users:

-   EH Forums Posting Manager (default your post options)
-   Tag Flagging (outlines tags instead of showing tag flags)

@usage_end

@licstart

Copyright (C) 2016 Luna Flina <43883@e-hentai.org>

This work is free. You can redistribute it and/or modify it under the
terms of the Do What The Fuck You Want To Public License, Version 2,
as published by Sam Hocevar. See the COPYING file for more details.

@licend
*/

var ownID = "5319009"; // (boobies) Replace this with your own user ID

var adminACL = ["6",        //Tenboro
                "25692"];   //Angel

var vetoACL = ["68896",     // 3d0xp0xy
               "90092",     // Alpha 7
               "243587",    // binglo
               "924439",    // blue penguin
               "631161",    // chaos-x
               "409722",    // danixxx
               "2790",      // elgringo
               "159384",    // etothex
               "1028280",   // freudia
               "971620",    // kitsuneH
               "43883",     // Luna_Flina
               "589675",    // Maximum_Joe
               "1898816",   // Mrsuperhappy
               "106471",    // nonotan
               "241107",    // ohmightycat
               "154972",    // pop9
               "176159",    // Rikis
               "2610932",   // Rinnosuke M.
               "2203",      // Spectre
               "582527",    // TheGreyPanther
               "301767"];   // varst

// If you use anchors for namespacing replace the URL below with the forum link
var NSURL = "https://forums.e-hentai.org/index.php?showtopic=88776&st=9999999";

var baseToolsURL = "http://g.e-hentai.org/tools.php?act=taglist&";
var selectors = "a[href*='showuser'], a[href*='/g/']:not([onclick]), p.g2 > a";
var links = document.querySelectorAll(selectors);
var loc = window.location.href;

function addCheckNode(linkNode)
{
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

function toggleVotes()
{
  form.tv.value = -form.tv.value;
  form.submit();
}

for (var i = 0; i < links.length; i++)
  addCheckNode(links[i]);

if (loc.indexOf("taglist&gid") > -1)
{
  var tagList = document.querySelectorAll("td:nth-of-type(1)");
  var scoreList = document.querySelectorAll("td:nth-of-type(2)");
  var userList = document.querySelectorAll("td:nth-of-type(3)");

  var score = 0;
  var tag = "";
  var tagTemp = "";
  var userID = "";

  for (var i = 0; i < tagList.length; i++)
    {
      userID = userList[i].firstChild.href.split('=').reverse()[0];

      if (adminACL.indexOf(userID) > -1)
        userList[i].style =
          (+scoreList[i].textContent < 0) ?
          "background-color:Gold; color:red; font-weight:bold":
          "background-color:Gold; color:green; font-weight:bold";
      else if (vetoACL.indexOf(userID) > -1)
        userList[i].style =
          (+scoreList[i].textContent < 0) ?
          "background-color:lightpink; color:red; font-weight:bold":
          "background-color:lightgreen; color:green; font-weight:bold";

      if (userID == ownID)
        userList[i].style.border = "5px solid";

      tag = tagList[i].textContent;

      if (tagTemp.split(" (")[0] == tag.split(" (")[0])
        score += +scoreList[i].textContent;
      else
        {
          score = +scoreList[i].textContent;

          if (i > 0)
            {
              var tr = document.createElement("tr");
              tr.setAttribute("height","22px");
              tagList[i].parentNode.parentNode.insertBefore(
                tr, tagList[i].parentNode.previousSibling);
            }

          var tagNew = tagList[i].parentNode.cloneNode(true);
          tagList[i].parentNode.parentNode.insertBefore(
            tagNew, tagList[i].parentNode.previousSibling);

          tagNew.style = "font-weight:bold; color:black";

          while (tagNew.children.length > 1)
            tagNew.removeChild(tagNew.lastChild);
        }

      tagList[i].textContent += " (" + score + ")";
      tagTemp = tagList[i].textContent;
    }
}

else if (loc.indexOf("taglist&uid") > -1)
{
  var tags = document.querySelectorAll("td:nth-of-type(3)");
  var aDiv = document.querySelector("div:nth-child(2)");

    var SVArray =
    document.getElementsByTagName('div')[2].textContent.split('Accuracy = ');
    var badStarted = (SVArray[1].split(' %')[0] <= 80);
    var badVoted = (SVArray[2].split(' %')[0] <= 90);
    
    if ((badStarted) || (badVoted)) aDiv.style.color = 'red';

  if (tags.length < 1)
    aDiv.innerHTML =
    "<strong>No tagging over the last 30 days</strong><br>" + aDiv.innerHTML;

  else
  {
    var stamps = document.querySelectorAll("td:nth-of-type(4)");
    var oldestTag = stamps[stamps.length-1].textContent.replace(" ","T") + "Z";
    var dateDiff = new Date(Date.now()-new Date(oldestTag));

    var days = dateDiff.getUTCDate()-1;
    var hours = dateDiff.getUTCHours();
    var minutes = dateDiff.getUTCMinutes();

    var activeDays = "";
    activeDays += (days > 0) ? days + " days " : "";
    activeDays += (hours > 0) ? hours + " hours " : "";
    activeDays += (minutes > 0) ? minutes + " minutes" : "";

    aDiv.innerHTML = "History:<strong> " + tags.length +
    "/1000 tags over the last "+ activeDays + "<br></strong>" + aDiv.innerHTML;
  }
}

else if (loc.indexOf("newtags") > -1)
{
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

