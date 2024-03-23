// ==UserScript==
// @name        eh-guid-report-view
// @namespace   EH
// @description Adds user vote tooltips for checkers
// @match     https://e-hentai.org/g/*
// @match     https://exhentai.org/g/*
// @license     GNU GPL v3
// @copyright   Aquamarine Penguin
// @version     0.4.4
// @grant       none
// ==/UserScript==
/*
@usage

The script provides tooltips describing the votes on the tags in a gallery.
Votes are taken from tools.php taglist with the current gallery UID through an
XHR request behind the scenes.  Controls for the script are located on the left
hand side of the browser window under the label "report", the controls are as
follows:

- no/off toggle defines whether the script will contact tools.php and add the
  tooltips (on) or not perform any work (off) and make the browsing faster.
  Local browser storage is used to remember the choice (on or off), which is
  remembered globally.  This means that enabling the script on one page will
  enable it for all pages loaded next.  Note that to save network usage the
  script does NOT reload itself based on local storage settings on focus change
  (e.g.  changing tabs or windows) which means that one needs to reload an old
  page to get the global setting.

- ↻ (reload) button serves to rebuild the tooltips when these get out of sync
  with the current tags.  Tagging actions that change the tags displayed in the
  gallery will cause the tooltips to go out of sync and out of place with the
  taglist, this may be inconvenient but is intended.  A solution to that would
  be to contact tools.php on every tagging action but even that would not
  provide a full solution due to different caches (see known bugs below).
  Hence, if you are changing the tags of the gallery, the best approach is to
  turn off the script temporarily or reload the script once the tagging is
  done.

- show/hide toggles showing fully downvoted tags. The tags are added into the
  existing table with a red border. The hover effect is still present and you
  can see the history of the tag.

- a↻/m↻ (auto reload) toggles between auto and manual reload. When enabled
  it monitors the tag table and upon being deleted it calls the click event
  of the reload button.

Known bugs/quirks:

1. The tooltips are positioned globally, according to the current position of
the tags in the tag field.  Hence, if the overflow produces a scrollbar in the
tagging field, moving the scrollbar will move the tooltips out of position.
The issue can be remedied by first scrolling and then hitting the reload button
in the script controls.  One possible fix would be to automatically reload the
script on scrolling events but that could hit `tools.php` very fast since every
reload is a new network call.  This bug is therefore left in order to protect
network traffic.  Hell, no gallery should ever need that many tags for the
scrollbar to appear.  If there is a scrollbar then there is something wrong in
the first place already.

2. The galleries and tools.php use different caches and it may happen that a
tag appears on the gallery that tools.php has not yet displayed.  In such a
case no tooltip will appear for the tag.  Hitting the reload button after a few
seconds should fix the issue, as the caches shall reach eventual consistency.

3. The console may be filled with messages about tags that could not be found.
These messages are about tags that have been downvoted to zero score.  We keep
these tags despite not showing any tooltip.  The behaviour may allow for a
feature where we restore removed tags to the gallery in order to check who
up/down voted them.  Currently the pollution from downvoted tags appear to
outweigh such a feature's usability but we keep the code for possible future
changes.

@usage_end

@licstart

eh-guid-report-view.user.js - adds user vote tooltips for checkers

Copyright (C) 2021 Aquamarine Penguin

This JavaScript code is free software: you can redistribute it and/or modify it
under the terms of the GNU General Public License (GNU GPL) as published by the
Free Software Foundation, either version 3 of the License, or (at your option)
any later version.

This JavaScript code is distributed WITHOUT ANY WARRANTY; without even the
implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See
the GNU GPL for more details.

The full text of the license can be found in the COPYING file.  If you cannot
find this file, see <http://www.gnu.org/licenses/>.

@licend
*/

"use strict;";

(function () {
  var script_uuid = "eh-guid-report-view";
  var taglistUrl = "https://repo.e-hentai.org/tools/taglist?gid=";

  function scriptPanel() {
    var panelId = "penguin-script-panel";
    var panel = document.getElementById(panelId);
    if (panel) {
      return panel;
    }
    var panel = document.createElement("div");
    var style = "position:fixed;z-index:100;top:0;left:0;";
    style += "padding:20px;border-radius:3px;border:2px solid white;";
    style += "text-align:left;font-size:10pt;";
    panel.style = style;
    panel.setAttribute("id", panelId);
    document.body.appendChild(panel);
    // we may wish to override this one often
    panel.style.cursor = "auto";
    return panel;
  }

  function curTags() {
    var tagList = document.getElementById("taglist");
    var tags = taglist.getElementsByTagName("a");
    return tags;
  }

  function clearTooltips(elems) {
    for (var i = 0; i < elems.length; i++) {
      var elem = elems[i];
      elem.onmouseover = null;
      elem.onmouseout = null;
    }
    var tips = document.getElementsByClassName("user-report-tooltip");
    console.log("Clear", tips.length, "tooltips.", elems.length, "tags");
    for (var j = tips.length - 1; j >= 0; j--) {
      tips[j].remove();
    }
  }

  function reloadTips(e) {
    var tags = curTags();
    var uid = window.location.pathname.split("/")[2];
    console.log("Reload");
    voteList(uid, tags);
  };

  function enrichGuidToogle(panel) {
    var label = document.createElement("div");
    var report = document.createTextNode("report");
    label.style.textAlign = "center";
    label.appendChild(report);

    var buttons = document.createElement("div");
    buttons.style.textAlign = "center";

    var reload = document.createElement("span");
    reload.style.padding = "2px";
    reload.style.cursor = "auto";
    reload.style.opacity = 0.5;
    var reloadText = document.createTextNode("↻");
    reload.appendChild(reloadText);


    var onoff = document.createElement("span");
    var off = document.createTextNode("off");
    var on = document.createTextNode("on");
    onoff.style.padding = "2px";
    onoff.style.cursor = "pointer";
    onoff.style.color = "crimson";
    onoff.appendChild(off);
    onoff.addEventListener("click", function(e) {
      // do the search every time
      var tags = curTags();
      if (onoff.contains(off)) {
        console.log("Turn on");
        onoff.style.color = "seagreen";
        localStorage.setItem(script_uuid, "on");
        var uid = window.location.pathname.split("/")[2];
        onoff.replaceChild(on, off);
        reload.addEventListener("click", reloadTips);
        reload.style.cursor = "pointer";
        reload.style.opacity = 1.0;
        voteList(uid, tags);
      } else {
        console.log("Turn off");
        onoff.style.color = "crimson";
        localStorage.setItem(script_uuid, "off");
        onoff.replaceChild(off, on);
        reload.removeEventListener("click", reloadTips);
        reload.style.cursor = "auto";
        reload.style.opacity = 0.5;
        clearTooltips(tags);
      }
    });

    var showhide = document.createElement("span");
    var hide = document.createTextNode("hide");
    var show = document.createTextNode("show");
    showhide.style.padding = "2px";
    showhide.style.cursor = "pointer";
    showhide.style.color = "crimson";
    showhide.appendChild(hide);
    showhide.addEventListener("click", function(e) {
      // do the search every time
      var tags = curTags();
      if (showhide.contains(hide)) {
        console.log("Turn on");
        showhide.style.color = "seagreen";
        localStorage.setItem(script_uuid + "showhide", "show");
        showhide.replaceChild(show, hide);
      } else {
        console.log("Turn off");
        showhide.style.color = "crimson";
        localStorage.setItem(script_uuid + "showhide", "hide");
        showhide.replaceChild(hide, show);
      }
    });

    if(stateSh == "show") {
      showhide.style.color = "seagreen";
      showhide.replaceChild(show, hide);
    }

    var aronoff = document.createElement("span");
    var aron = document.createTextNode("a↻");
    var aroff = document.createTextNode("m↻");
    aronoff.style.padding = "2px";
    aronoff.style.cursor = "pointer";
    aronoff.style.color = "crimson";
    aronoff.appendChild(aroff);
    aronoff.addEventListener("click", function(e) {
      // do the search every time
      var tags = curTags();
      if (aronoff.contains(aroff)) {
        console.log("Turn on");
        aronoff.style.color = "seagreen";
        localStorage.setItem(script_uuid + "ar", "a↻");
        aronoff.replaceChild(aron, aroff);
      } else {
        console.log("Turn off");
        aronoff.style.color = "crimson";
        localStorage.setItem(script_uuid + "ar", "m↻");
        aronoff.replaceChild(aroff, aron);
      }
    });

    if(stateAr == "a↻") {
      aronoff.style.color = "seagreen";
      aronoff.replaceChild(aron, aroff);
    }

    buttons.appendChild(onoff);
    buttons.appendChild(reload);
    buttons.appendChild(document.createElement("br"));
    buttons.appendChild(showhide);
    buttons.appendChild(aronoff);
    panel.appendChild(label);
    panel.appendChild(buttons);
    return { onoff: onoff, showhide: showhide };
  }

  function voteList(uid, elems) {
    console.log("Found", elems.length, "tags for uid", uid);
    var turl = taglistUrl + uid;
    var req = new window.XMLHttpRequest();
    req.addEventListener("load", function () {
        console.log("Answer", req.status, req.responseType);
        enrichTags(req.responseXML, elems);
    });
    req.open("GET", turl, true);
    req.withCredentials = true;
    // may not work on ancient browsers
    req.responseType = "document";
    req.send();
  }

  function reorderReportTags(tags) {
      return Array.from(tags).sort((a, b) => {
          const fixTemp = (tag) => (!tag.textContent.includes(":") ? "temp:" + tag.textContent : tag.textContent);

          const aId = "td_" + fixTemp(a).replaceAll(" ", "_");
          const bId = "td_" + fixTemp(b).replaceAll(" ", "_");
          const aElem = document.getElementById(aId);
          const bElem = document.getElementById(bId);

          if(aElem && !bElem) return 1;
          if(!aElem && bElem) return -1;
          return 0;
      });
  }

  function enrichTags(dom, elems) {
    var reportTags = dom.querySelectorAll("a[href*='\/tag\/']");
    console.log("Enrich", reportTags.length, "tags");
    clearTooltips(elems);
    reportTags = reorderReportTags(reportTags);
    for (var i = 0; i < reportTags.length; i++) {
      var tag = reportTags[i];
      var tagContent = tag.textContent.replaceAll(" ", "_");
      var id = "td_" + (!tagContent.includes(":") ? "temp:" + tagContent : tagContent);
      var elem = document.getElementById(id);
      if (!elem) {
        if(stateSh == "show") {
          var tagText = null;
          var nameSpace = null;
          if(tag.textContent.includes(":")) {
            tagText = tag.textContent.split(":")[1];
            nameSpace = tag.textContent.split(":")[0] + ":";
          } else {
            tagText = tag.textContent.split(":")[0];
            nameSpace = "";
          }

          var namespaces = document.getElementsByClassName("tc");
          var curNS = Array.from(namespaces).find(element => element.innerText == nameSpace);
          if(!curNS) {
              var tagTableBody = document.getElementById('taglist').getElementsByTagName('tbody')[0];
              if(!tagTableBody) {
                  var tagSection = document.getElementById('taglist');
                  tagSection.replaceChildren();
                  tagTableBody = document.createElement("tbody");
                  var table = document.createElement("table");
                  table.appendChild(tagTableBody);
                  tagSection.appendChild(table);
              }
              var newNamespace = document.createElement("tr");
              var newNsTd = document.createElement("td");
              newNsTd.innerText = nameSpace;
              newNsTd.className = "tc";
              newNamespace.appendChild(newNsTd);
              var newTagTd = document.createElement("td");
              newNamespace.appendChild(newTagTd);
              tagTableBody.appendChild(newNamespace);
              curNS = newNsTd;
          }

          var tagId = tag.parentElement.previousElementSibling.textContent;
          var tagsTd = curNS.nextSibling;
          var tagDiv = document.createElement("div");
          tagDiv.setAttribute("id", id);
          tagDiv.className = "gt";
          tagDiv.style.borderColor = "red";
          tagDiv.style.opacity = 0.5;
          var tagNameA = document.createElement("a");
          tagNameA.innerText = tagText;
          tagNameA.href = "/tag/" + tag.textContent;
          tagNameA.setAttribute("onclick","return toggle_tagmenu(" + tagId + ",'" + tag.textContent +"',this)");
          tagDiv.appendChild(tagNameA);
          tagsTd.appendChild(tagDiv);
          elem = tagDiv;
        } else {
          console.log("Failed to find tag for id", id);
          continue;
        }
      }
      var tagTop = tag.parentNode.parentNode.parentNode.parentNode;
      var tip = tagTop.nextElementSibling.children[1];
      var tool = tipBelow(elem, tip);
      // closures - i hate JS scopes
      elem.onmouseover = (function() {
        const myTool = tool;
        const myElem = elem;
        return function (e) {
          const ad = document.getElementById("spa");
          const posTaglist = document.getElementById("taglist").getBoundingClientRect();
          const adHeight = ad ? ad.getBoundingClientRect().height : 0;
          const y = myElem.getBoundingClientRect().bottom + adHeight - posTaglist.y;
          myTool.style.top = `${y}px`;
          myTool.style.display = "block";
        }
      })();
      elem.onmouseout = (function() {
        var myTool = tool;
        return function (e) {
          myTool.style.display = "none";
        }
      })();
    }
  }

  function tipBelow(el, tip) {
    var pos = el.getBoundingClientRect();
    var taglist = document.getElementById("taglist");
    var ad = document.getElementById("spa");
    var adHeight = 0;
    if(ad) {
        adHeight = ad.getBoundingClientRect().height;
    }
    var posTaglist = taglist.getBoundingClientRect();
    var div = document.createElement("div");
    var style = "position: absolute;";
    style += "background-color: snow;";
    style += "color: black;";
    style += "opacity: 0.9;";
    style += "padding: 3px;";
    style += "border-radius: 6px;";
    style += "font-size: 1.2em;";
    style += "transform: translate(-5%);";
    div.style = style;
    div.style.top = (pos.y - posTaglist.y + pos.height + adHeight) + "px";
    div.style.left = (pos.x - posTaglist.x) + "px";
    div.style.zIndex = 110;
    div.style.display = "none";
    var a = tip.getElementsByTagName("a");
    for (var i=0; i < a.length; i++) {
      a[i].style.color = "black";
    }
    div.appendChild(tip);
    div.className = "user-report-tooltip";
    div.appendChild(tip);
    taglist.appendChild(div);
    if(addStyle) {
      var table = div.getElementsByTagName("table");
      addStyle(table[0], el);
    }
    return div;
  }

  var stateSh = localStorage.getItem(script_uuid + "showhide");
  var stateAr = localStorage.getItem(script_uuid + "ar");
  var panel = scriptPanel();
  var buttons = enrichGuidToogle(panel);
  var onoff = buttons.onoff;
  var showhide = buttons.showhide;
  var state = localStorage.getItem(script_uuid);
  if ("on" === state) {
    onoff.click();
  }

  function addWatcher() {
      const watchNode = document.getElementById("taglist");
      const config = { attributes: false, childList: true, subtree: false };
      const mutCallback = (mutationList, observer) => {
          for (const mutation of mutationList) {
              if (mutation.type === "childList") {
                  if(mutation.removedNodes.length > 0 && mutation.removedNodes[0].tagName == "TABLE") {
                      if(localStorage.getItem(script_uuid + "ar") === "a↻") {
                        reloadTips();
                      }
                  }
              }
          }
      };
      const observer = new MutationObserver(mutCallback);
      observer.observe(watchNode, config);
  }
  addWatcher();

  var ownID = getCookie('ipb_member_id');
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

    function addStyle(table, el) {
      var adminUp = "background-color:gold; color:green; font-weight:bold;";
      var adminDown = "background-color:gold; color:red; font-weight:bold;";
      var vetoUp = "background-color:lightgreen; color:green; font-weight:bold;";
      var vetoDown = "background-color:lightpink; color:red; font-weight:bold;";
      var scoreList = table.querySelectorAll("td:nth-of-type(1)");
      var userList = table.querySelectorAll("td:nth-of-type(2)");
      var totalScore = 0;
      var totalVeto = 0;
      var votedUp = false;
      var votedDown = false;
      for (var i=0; i < scoreList.length; i++) {
        var href = userList[i].firstChild.href;
        var userID = /showuser=(\w+)/.exec(href)[1];
        var score = parseInt(scoreList[i].textContent);
        totalScore = Math.min(totalScore += score, 200);
        if (adminACL.indexOf(userID) > -1) {
          if (score > 0) {
            userList[i].style = adminUp;
          } else {
            userList[i].style = adminDown;
            totalVeto = 3;
          }
        } else if (vetoACL.indexOf(userID) > -1) {
          if (score > 0) {
            userList[i].style = vetoUp;
          } else {
            totalVeto++;
            userList[i].style = vetoDown;
          }
        }
        if (userID == ownID) {
          userList[i].style.border = "3px solid";
          if(score > 0) {
            votedUp = true;
          } else {
            votedDown = true;
          }
        }
      }
      var row = table.getElementsByTagName("tbody")[0].insertRow();
      row.style = "";
      if(totalScore > 0) {
          row.innerHTML = '<td style="width:30px; font-weight:bold; color:green;border-top: 2px solid black;">+' + totalScore + '</td>';
      } else if(totalScore == 0) {
          row.innerHTML = '<td style="width:30px; font-weight:bold; color:black;border-top: 2px solid black;">&nbsp;' + totalScore + '</td>';
      } else {
          row.innerHTML = '<td style="width:30px; font-weight:bold; color:red;border-top: 2px solid black;">' + totalScore + '</td>';
      }
      if(el.style.borderColor === "red") {
        if(votedUp) {
            el.firstChild.className = "tup";
        } else if(votedDown) {
            el.firstChild.className = "tdn";
        }
        if(totalVeto >= 3) {
        } else if(totalVeto >= 1) {
            el.className = "gtl";
        } else {
            el.className = "gtw";
        }
      }

    };

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }
})();

console.log("eh-guid-report-view is active")
