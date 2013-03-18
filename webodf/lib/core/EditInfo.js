/**
 * Copyright (C) 2012 KO GmbH <aditya.bhatt@kogmbh.com>
 * @licstart
 * The JavaScript code in this page is free software: you can redistribute it
 * and/or modify it under the terms of the GNU Affero General Public License
 * (GNU AGPL) as published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.  The code is distributed
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU AGPL for more details.
 *
 * As additional permission under GNU AGPL version 3 section 7, you
 * may distribute non-source (e.g., minimized or compacted) forms of
 * that code without the copy of the GNU GPL normally required by
 * section 4, provided you include this license notice and a URL
 * through which recipients can access the Corresponding Source.
 *
 * As a special exception to the AGPL, any HTML file which merely makes function
 * calls to this code, and for that purpose includes it by reference shall be
 * deemed a separate work for copyright law purposes. In addition, the copyright
 * holders of this code give you permission to combine this code with free
 * software libraries that are released under the GNU LGPL. You may copy and
 * distribute such a system following the terms of the GNU AGPL for this code
 * and the LGPL for the libraries. If you modify this code, you may extend this
 * exception to your version of the code, but you are not obligated to do so.
 * If you do not wish to do so, delete this exception statement from your
 * version.
 *
 * This license applies to this entire compilation.
 * @licend
 * @source: http://www.webodf.org/
 * @source: http://gitorious.org/webodf/webodf/
 */
/*global core, ops, runtime*/

/**
 * @constructor
 * @param {!ops.OdtDocument} odtDocument
 */
core.EditInfo = function EditInfo(container, odtDocument) {
    "use strict";
    var self = this,
        editInfoNode,
        editHistory = {};
    
    function sortEdits() {
        var arr = [],
            memberid;
        for (memberid in editHistory) {
            if (editHistory.hasOwnProperty(memberid)) {
                arr.push({
                    'memberid': memberid,
                    'time': editHistory[memberid].time
                });
            }
        }
        
        arr.sort(function (a, b) {
            return a.time - b.time;
        });
        
        return arr; // returns array
    }

    this.getNode = function () {
        return editInfoNode;
    };

    this.getOdtDocument = function () {
        return odtDocument;
    };
    
    this.getEdits = function () {
        return editHistory;
    };
    
    this.getSortedEdits = function () {
        return sortEdits();
    };
    this.addEdit = function (memberid, timestamp) {
        // We want only the latest edit by a user, even if the user has
        // different avatars with different memberids
        var id,
            userid = memberid.split('___')[0];

        // If the edit history for this paragraph does not have any entry for
        // this memberid
        if (!editHistory[memberid]) {
            // Check if this memberid is of the same user as any previous memberid (id) in
            // the editHistory.
            for (id in editHistory) {
                if (editHistory.hasOwnProperty(id)) {
                    if (id.split('___')[0] === userid) {
                        // Delete the history associated with the old memberid
                        delete editHistory[id];
                        break;
                    }
                }
            }
        }

        // log the edit time for this memberid
        editHistory[memberid] = {
            time: timestamp
        };
    };

    this.clearEdits = function () {
        editHistory = {};
    };

    function init() {
        var editInfons = 'urn:webodf:names:editinfo',
            dom = odtDocument.getDOM();

        editInfoNode = dom.createElementNS(editInfons, 'editinfo');
        container.insertBefore(editInfoNode, container.firstChild);
    }

    init();
};
