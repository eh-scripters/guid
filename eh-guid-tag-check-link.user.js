// ==UserScript==
// @name         Tag Check Links
// @version      0.3.2
// @description  Add shortcut link(s) to tag checking pages via galleries
// @author       nasu_sensei
// @match        https://e-hentai.org/g/*
// @match        https://exhentai.org/g/*
// @grant        none
// ==/UserScript==

"use strict;";

(function () {
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

  var baseToolsURL = "https://repo.e-hentai.org/tools/taglist?gid=";
  var galleryID = window.location.pathname.split("/")[2];

  var label = document.createElement("div");
  var labelText = document.createTextNode("check");
  label.appendChild(labelText);
  var check = document.createElement("div");
  var checkAnchor = document.createElement("a");
  var style = "font-weight:bold;font-size:14pt;text-decoration:none;";
  checkAnchor.style = style;
  checkAnchor.setAttribute("target", "_blank");
  checkAnchor.setAttribute("href", baseToolsURL + galleryID);
  var checkText = document.createTextNode("✔");
  checkAnchor.appendChild(checkText);
  check.appendChild(checkAnchor);
  var main = document.createElement("div");
  main.style.textAlign = "center";
  main.appendChild(label);
  main.appendChild(check);

  var panel = scriptPanel();
  panel.appendChild(main);
})();

console.log("eh-guid-tag-check-link is active");

