// ==UserScript==
// @name        eh-guid-report-view
// @namespace   EH
// @description Adds user vote tooltips for checkers
// @include     https://e-hentai.org/g/*
// @license     GNU GPL v3
// @copyright   Aquamarine Penguin
// @version     0.2
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
  var taglistUrl = "https://repo.e-hentai.org/tools.php?act=taglist&gid=";

  function scriptPanel() {
    var panelId = "penguin-script-panel";
    var panel = document.getElementById(panelId);
    if (panel) {
      return panel;
    }
    var panel = document.createElement("div");
    var style = "opacity:0.7;position:fixed;z-index:100;top:0;left:0;";
    style += "padding:20px;border-radius:3px;border:2px solid white;";
    style += "text-align:left;font-size:10pt;background:white;";
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
    function reloadTips(e) {
      var tags = curTags();
      var uid = window.location.pathname.split("/")[2];
      console.log("Reload");
      voteList(uid, tags);
    };

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

    buttons.appendChild(onoff);
    buttons.appendChild(reload);
    panel.appendChild(label);
    panel.appendChild(buttons);
    return onoff;
  }

  function voteList(uid, elems) {
    console.log("Found", elems.length, "tags for uid", uid);
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
    style += "background-color: snow;";
    style += "opacity: 0.9;";
    style += "padding: 3px;";
    style += "border-radius: 6px;";
    style += "font-size: 1.2em;";
    style += "transform: translate(-30%);";
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
  var onoff = enrichGuidToogle(panel);
  var state = localStorage.getItem(script_uuid);
  if ("on" === state) {
    onoff.click();
  }
})();

console.log("eh-guid-report-view is active");

