/* Replaces each selected item with a chosen Symbol from the Symbol panel (symbol should already exist)
 * Center-align via delta translation; always size-match; optional delete originals.
 */
(function () {
    if (!app.documents.length) { alert("Open a document first."); return; }
    var doc = app.activeDocument;
    if (!doc.selection || !doc.selection.length) { alert("Select the markers you want to replace."); return; }
    if (doc.symbols.length === 0) {
        alert("No symbols in this document.\nCreate one (Window > Symbols), then run again.");
        return;
    }

    // ---------- UI ----------
    var dlg = new Window('dialog', 'Replace With Symbol');
    dlg.orientation = 'column'; dlg.alignChildren = 'fill';
    var head = dlg.add('group'); head.add('statictext', undefined,
        "Choose the symbol to place for each selected item.\nSelected items: " +
        doc.selection.length + "    Symbols: " + doc.symbols.length);

    var symRow = dlg.add('group'); symRow.alignment = 'fill';
    symRow.add('statictext', undefined, 'Symbol:');
    var dd = symRow.add('dropdownlist', undefined, []);
    for (var i = 0; i < doc.symbols.length; i++) dd.add('item', doc.symbols[i].name);
    dd.selection = 0;

    var opts = dlg.add('panel', undefined, 'Options'); opts.alignChildren = 'left';
    var delCB = opts.add('checkbox', undefined, 'Delete originals (instead of hiding)');
    delCB.value = false;

    var btns = dlg.add('group'); btns.alignment = 'right';
    var okBtn = btns.add('button', undefined, 'Replace', { name: 'ok' });
    btns.add('button', undefined, 'Cancel', { name: 'cancel' });
    if (dlg.show() !== 1) return;

    var chosenSym = doc.symbols[dd.selection.index];

    // Work in page (document) coordinates to avoid artboard-origin surprises.
    var prevCS = app.coordinateSystem;
    app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;

    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
    app.executeMenuCommand('doc-color-cmyk'); // harmless nudge to ensure DOM is responsive

    // Snapshot selection (it will change as we add instances)
    var items = [];
    for (var s = 0; s < doc.selection.length; s++) items.push(doc.selection[s]);

    // Helper: get center from visibleBounds [L, T, R, B]
    function centerOf(vb) {
        return { cx: (vb[0] + vb[2]) / 2, cy: (vb[1] + vb[3]) / 2 };
    }

    // Process
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        // Skip locked/hidden containers, guides, etc.
        if (!it || it.locked || it.hidden) continue;

        try {
            var vb = it.visibleBounds;         // [L, T, R, B]
            var w  = vb[2] - vb[0];
            var h  = vb[1] - vb[3];
            var c  = centerOf(vb);

            // Create instance and parent it beside the original
            var inst = doc.symbolItems.add(chosenSym);
            inst.move(it, ElementPlacement.PLACEBEFORE);

            // Size-match first (width/height are in points)
            inst.width  = w;
            inst.height = h;

            // Rough place near original (anywhere is fine—we’ll delta-align)
            inst.position = [vb[0], vb[1]];  // uses page coordinates, top-left of instance

            // Compute delta center and translate relatively (robust to coord origins)
            var vb2 = inst.visibleBounds;
            var c2  = centerOf(vb2);
            inst.translate(c.cx - c2.cx, c.cy - c2.cy, true, true, true, true); // move by delta

            // Optional: delete or hide original
            if (delCB.value) it.remove();
            else it.hidden = true;

        } catch (e) {
            // Continue with the rest; you can surface details if needed
            // $.writeln("Failed on item " + i + ": " + e);
        }
    }

    // Restore
    app.coordinateSystem = prevCS;
    app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
})();