/**
 * Copyright (C) 2012 KO GmbH <copyright@kogmbh.com>
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
/*jslint nomen: true, evil: true, bitwise: true */
/*global core, ops, runtime*/

/**
 * @constructor
 * @implements ops.Operation
 */
ops.OpSplitParagraph = function OpSplitParagraph(session) {
    "use strict";

    var memberid, timestamp, position;

    this.init = function (data) {
        memberid = data.memberid;
        timestamp = data.timestamp;
        position = data.position;
    };

    this.execute = function (rootNode) {
        var odtDocument = session.getOdtDocument(),
            domPosition, paragraphNode,
            textNodeCopy,
            node, splitNode, splitChildNode, keptChildNode;

        domPosition = odtDocument.getPositionInTextNode(position);
        if (domPosition) {
            paragraphNode = odtDocument.getParagraphElement(domPosition.textNode);
            if (paragraphNode) {
                // There can be a chain of multiple nodes between the text node
                // where the split is done and the containing paragraph nodes,
                // e.g. text:span nodes
                // So all nodes in this chain need to be split up, i.e. they need
                // to be cloned, and then the clone and any next siblings have to
                // be moved to the new paragraph node, which is also cloned from
                // the current one.

                // start with text node the cursor is in, needs special treatment
                // if text node is split at the beginning, do not split but simply
                // move the whole text node
                if (domPosition.offset === 0) {
                    keptChildNode = domPosition.textNode.previousSibling;
                    splitChildNode = null;
                } else {
                    // Add special treatment for cursor:
                    // cursors are keeping a pointer to the textnode to their left,
                    // for some optimization to reduce the number of textNode creations/deletions.
                    // As it can happen that we split (part of) the textnode before a cursor,
                    // (actually that should be often the case due to the cursor-oriented input)
                    // we have to workaround that optimization. This is done by cloning the textnode
                    // and removing the old textnode from the DOM and cleaning its data.
                    if (domPosition.textNode.nextSibling &&
                        domPosition.textNode.nextSibling.namespaceURI === 'urn:webodf:names:cursor' &&
                        domPosition.textNode.nextSibling.localName === 'cursor') {
                        // insert copy of current textnode
                        textNodeCopy = domPosition.textNode.cloneNode(false);
                        domPosition.textNode.parentNode.insertBefore(textNodeCopy, domPosition.textNode);
                        // unset old textnode
                        domPosition.textNode.parentNode.removeChild(domPosition.textNode);
                        domPosition.textNode = "";
                        // and continue normally with the copied text node
                        domPosition.textNode = textNodeCopy;
                    }

                    keptChildNode = domPosition.textNode;
                    // if text node is to be split at the end, don't split at all
                    if (domPosition.offset >= domPosition.textNode.length) {
                        splitChildNode = null;
                    } else {
                        // splitText always returns {!Text} here
                        splitChildNode = /**@type{!Text}*/(
                            domPosition.textNode.splitText(domPosition.offset)
                        );
                    }
                }

                // then handle all nodes until (incl.) the paragraph node:
                // create a clone and add as childs the split node of the node below
                // and any next siblings of it
                node = domPosition.textNode;
                while (node !== paragraphNode) {
                    node = node.parentNode;

                    // split off the node copy
                    // TODO: handle unique attributes, e.g. xml:id
                    splitNode = node.cloneNode(false);
                    // if the existing node will be completely empty,
                    // just switch roles and insert the empty clone as old node
                    if (! keptChildNode) {
                        node.parentNode.insertBefore(splitNode, node);

                        // prepare next level
                        keptChildNode = splitNode;
                        splitChildNode = node;
                    } else {
                        // add the split child node
                        if (splitChildNode) {
                            splitNode.appendChild(splitChildNode);
                        }
                        // and move all child nodes behind the split to the node copy,
                        // by using n.nextSibling as automatically updated queue head
                        while (keptChildNode.nextSibling) {
                            splitNode.appendChild(keptChildNode.nextSibling);
                        }
                        node.parentNode.insertBefore(splitNode, node.nextSibling);

                        // prepare next level
                        keptChildNode = node;
                        splitChildNode = splitNode;
                    }
                }

                // mark both paragraphs as edited
                odtDocument.emit('paragraphEdited', {
                    element: paragraphNode,
                    memberId: memberid,
                    timeStamp: timestamp
                });
                odtDocument.emit('paragraphEdited', {
                    element: splitChildNode,
                    memberId: memberid,
                    timeStamp: timestamp
                });
            }
        }
    };

    this.spec = function () {
        return {
            optype: "SplitParagraph",
            memberid: memberid,
            timestamp: timestamp,
            position: position
        };
    };
};
