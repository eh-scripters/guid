// ==UserScript==
// @name        eh-guid-report-view
// @namespace   EH
// @description Adds user vote tooltips for checkers
// @include     https://e-hentai.org/g/*
// @license     GNU GPL v3
// @copyright   Aquamarine Penguin
// @version     0.1
// @grant       none
// ==/UserScript==
/*
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

"use strict";

(function () {
  var taglistUrl = "https://repo.e-hentai.org/tools.php?act=taglist&gid=";

  function scriptPanel() {
    var panel = document.getElementById("penguin-script-panel");
    if (panel) {
      return panel;
    }
    var panel = document.createElement("div");
    var style = "opacity:0.7;position:fixed;z-index:100;top:0;left:0;";
    style += "padding:20px;border-radius:3px;border:2px solid white;";
    style += "text-align:left;font-size:10pt;background:white;";
    panel.style = style;
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

  function enrichGuidToogle(panel) {
    var label = document.createElement("div");
    var button = document.createElement("div");
    var report = document.createTextNode("rtag");
    var tally = document.createTextNode("𝍸");
    var reload = document.createTextNode("⟳");
    label.appendChild(report);
    label.style.textAlign = "center";
    button.appendChild(tally);
    button.style.textAlign = "center";
    button.style.cursor = "pointer";
    button.addEventListener("click", function(e) {
      if (button.contains(tally)) {
        button.replaceChild(reload, tally);
      }
      // do the search every time
      var tags = curTags();
      var uid = window.location.pathname.split("/")[2];
      console.log("Found", tags.length, "tags for uid", uid);
      voteList(uid, tags);
    });
    panel.appendChild(label);
    panel.appendChild(button);
  }

  function voteList(uid, elems) {
    var turl = taglistUrl + uid;
    var req = new XMLHttpRequest();
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

  function clearTooltips(elems) {
    for (var i = 0; i < elems.length; i++) {
      var elem = elems[i];
      elem.onmouseover = null;
      elem.onmouseout = null;
    }
    var tips = document.getElementsByClassName("user-report-tooltip");
    console.log("Clear", tips.length, "tooltips");
    for (var j = 0; j < tips.length; j++) {
      var tip = tips[j];
      tip.parentNode.removeChild(tip);
    }
  }

  function enrichTags(dom, elems) {
    var reportTags = dom.querySelectorAll("a[href*='\/tag\/']");
    console.log("Enrich", reportTags.length, "tags");
    clearTooltips(elems);
    for (var i = 0; i < reportTags.length; i++) {
      var tag = reportTags[i];
      var id = "td_" + tag.textContent.replaceAll(" ", "_");
      var elem = document.getElementById(id);
      if (!elem) {
        console.log("Failed to find tag for id", id);
        continue;
      }
      var tagTop = tag.parentNode.parentNode.parentNode.parentNode;
      var tip = tagTop.nextElementSibling.children[1];
      var tool = tipBelow(elem, tip);
      // closures - i hate JS scopes
      elem.onmouseover = (function() {
        var myTool = tool;
        return function (e) {
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
    var div = document.createElement("div");
    var style = "position: absolute;";
    style += "background-color: #e2e2e2;";
    style += "opacity: 0.9;";
    style += "padding: 3px;";
    style += "border-radius: 3px;";
    style += "font-size: 1.1em;";
    div.style = style;
    div.style.top = pos.y + pos.height + "px";
    div.style.left = pos.x + "px";
    div.style.zIndex = 110;
    div.style.display = "none";
    div.appendChild(tip);
    div.className = "user-report-tooltip";
    div.appendChild(tip);
    document.body.appendChild(div);
    return div;
  }

  var panel = scriptPanel();
  enrichGuidToogle(panel);
})();

console.log("eh-guid-report-view is active");

