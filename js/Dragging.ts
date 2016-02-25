/*				DRAGGING.JS
	Handles Graphical Drag of Modules and Connections
	This is a historical file from Chris Wilson, modified for Faust ModuleClass needs.
	
	--> Things could probably be easier...
	
	DEPENDENCIES :
		- Connect.js
		- ModuleClass.js
		
*/

/// <reference path="Connect.ts"/>
/// <reference path="App.ts"/>
/// <reference path="main.ts"/>
/// <reference path="Modules/ModuleClass.ts"/>
/// <reference path="Pedagogie/Tooltips.ts"/>



"use strict";



/***********************************************************************************/
/****** Node Dragging - these are used for dragging the audio modules interface*****/
/***********************************************************************************/


class Drag {

    zIndex: number = 0;
    lastLit: HTMLInterfaceContainer;
    cursorStartX: number;
    cursorStartY: number;
    elementStartLeft: number;
    elementStartTop: number;
    originIsInput: boolean;
    connector: Connector = new Connector();
    elemNode: HTMLElement;

    startDraggingModule(event: MouseEvent, module: ModuleClass):void {

        var el: HTMLElement = <HTMLElement>event.target;
        var x: number, y: number;
  	
    //   Avoid dragging ModuleClass when it's a Connector that needs dragging
	    if (el.tagName == "SELECT" || el.classList.contains("node-button"))
		    return;

    //   Avoid dragging ModuleClass when it's a UI element that needs dragging
	    if (el.nodeType == 3) // if it's a text node
		    el = <HTMLElement>el.parentNode;
	    if (el.classList.contains("module-title"))
            el = <HTMLElement>el.parentNode;
	    if (el.classList.contains("content"))
            el = <HTMLElement>el.parentNode;
	    if (!el.classList.contains("moduleFaust"))
		    return;

        var moduleContainer: HTMLElement = module.moduleView.getModuleContainer();


	    // Get cursor position with respect to the page.
        x = event.clientX + window.scrollX;
        y = event.clientY + window.scrollY;

  	    // Save starting positions of cursor and element.
        this.cursorStartX = x;
        this.cursorStartY = y;
        this.elementStartLeft = parseInt(moduleContainer.style.left, 10);
  	    this.elementStartTop   = parseInt(moduleContainer.style.top,  10);

            if (isNaN(this.elementStartLeft)) this.elementStartLeft = 0;
            if (isNaN(this.elementStartTop)) this.elementStartTop = 0;

  	    // Update element's z-index.
	    //moduleContainer.style.zIndex = String(++this.zIndex);

        // Capture mousemove and mouseup events on the page.
        module.addListener("mousemove", module);
        module.addListener("mouseup", module);

        event.preventDefault();
    }

    whileDraggingModule(event: MouseEvent, module: ModuleClass): void {
        var x: number, y: number;

        var moduleContainer = module.moduleView.getModuleContainer();
	
	    // Get cursor position with respect to the page.
        x = event.clientX + window.scrollX;
        y = event.clientY + window.scrollY;

        // Move drag element by the same amount the cursor has moved.
        moduleContainer.style.left = (this.elementStartLeft + x - this.cursorStartX) + "px";
        moduleContainer.style.top = (this.elementStartTop + y - this.cursorStartY) + "px";

        if (module.moduleFaust.getInputConnections() != null) {	// update any lines that point in here.

            var offset: HTMLElement = module.moduleView.getInputNode();
            x = window.scrollX + module.moduleView.inputOutputNodeDimension/2;
            y = window.scrollY + module.moduleView.inputOutputNodeDimension / 2;

            while (offset) {
		
                x += offset.offsetLeft;
                y += offset.offsetTop;
                offset = <HTMLDivElement>offset.offsetParent;
		    }

            for (var c = 0; c < module.moduleFaust.getInputConnections().length; c++) {

                var currentConnectorShape: ConnectorShape = module.moduleFaust.getInputConnections()[c].connectorShape;
                var x1 = x;
                var y1 = y;
                var x2 = currentConnectorShape.x2
                var y2 = currentConnectorShape.y2
                var d = this.setCurvePath(x1, y1, x2, y2, this.calculBezier1(x1, x2), this.calculBezier2(x1, x2))
                currentConnectorShape.setAttributeNS(null, "d", d);
                this.updateConnectorShapePath(currentConnectorShape, x1, x2, y1, y2);


		    }
	    }

        if (module.moduleFaust.getOutputConnections() != null) {	// update any lines that point out of here.
		    

            var offset = module.moduleView.getOutputNode();
            x = window.scrollX + module.moduleView.inputOutputNodeDimension / 2;
            y = window.scrollY + module.moduleView.inputOutputNodeDimension / 2;

            while (offset) {
                x += offset.offsetLeft;
                y += offset.offsetTop;
                offset = <HTMLDivElement>offset.offsetParent;
		    }

            for (var c = 0; c < module.moduleFaust.getOutputConnections().length; c++) {

                if (module.moduleFaust.getOutputConnections()[c].connectorShape) {
                    var currentConnectorShape: ConnectorShape = module.moduleFaust.getOutputConnections()[c].connectorShape;
                    var x1 = currentConnectorShape.x1;
                    var y1 = currentConnectorShape.y1;
                    var x2 = x;
                    var y2 = y;
                    var d = this.setCurvePath(x1, y1, x2, y2, this.calculBezier1(x1, x2), this.calculBezier2(x1, x2))
                    
                    currentConnectorShape.setAttributeNS(null, "d", d);
                    this.updateConnectorShapePath(currentConnectorShape,x1, x2, y1, y2);

                    //module.moduleFaust.getOutputConnections()[c].connectorShape.setAttributeNS(null, "x2", String(x));
                    //module.moduleFaust.getOutputConnections()[c].connectorShape.setAttributeNS(null, "y2", String(y));
			    }
		    }
	    }

        event.preventDefault();
    }

    stopDraggingModule(event: MouseEvent, module: ModuleClass):void {
      // Stop capturing mousemove and mouseup events.
        module.removeListener("mousemove", null, document);
        module.removeListener("mouseup", null, document);
    }

    /************************************************************************************/
    /*** Connector Dragging - these are used for dragging the connectors between nodes***/
    /************************************************************************************/

    updateConnectorShapePath(connectorShape:ConnectorShape,x1: number, x2: number, y1: number, y2: number) {
        connectorShape.x1 = x1;
        connectorShape.x2 = x2;
        connectorShape.y1 = y1;
        connectorShape.y2 = y2;
    }

    setCurvePath(x1: number, y1: number, x2: number, y2: number, x1Bezier: number, x2Bezier: number): string {
        return "M" + x1 + "," + y1 + " C" + x1Bezier + "," + y1 + " " + x2Bezier + "," + y2 + " " + x2 + "," + y2;

    }
    calculDistance(x1: number, x2: number): number{
        return (x1 - x2) / 2;
    }
    calculBezier1(x1: number, x2: number): number {
        return x1 - this.calculDistance(x1, x2);
    }
    calculBezier2(x1: number, x2: number): number {
        return x2 + this.calculDistance(x1, x2);
    }


    startDraggingConnection(module: ModuleClass, target: HTMLElement):void {

        // if this is the green or red button, use its parent.
        if (target.classList.contains("node-button"))
    	    target = <HTMLElement>target.parentNode; 

        // Get the position of the originating connector with respect to the page.
        var offset: HTMLElement = target;
        var x: number = window.scrollX + module.moduleView.inputOutputNodeDimension / 2;
        var y: number = window.scrollY + module.moduleView.inputOutputNodeDimension / 2;

        while (offset) {
            x += offset.offsetLeft;
            y += offset.offsetTop;
            offset = <HTMLElement> offset.offsetParent;
	    }

  	    // Save starting positions of cursor and element.
  	    this.cursorStartX = x;
  	    this.cursorStartY = y;

	    // remember if this is an input or output node, so we can match
	    this.originIsInput = target.classList.contains("node-input");

        module.moduleView.getInterfaceContainer().unlitClassname = module.moduleView.getInterfaceContainer().className;
        module.moduleView.getInterfaceContainer().className += " canConnect";
	
	    // Create a connector visual line
	    var svgns:string = "http://www.w3.org/2000/svg";

        var curve: SVGElement = <SVGElement>document.createElementNS(svgns, "path");
        var d = this.setCurvePath(x,y,x,y,x,x)
        curve.setAttributeNS(null, "d", d);
        curve.setAttributeNS(null, "stroke", "black");
        curve.setAttributeNS(null, "stroke-width", "5");
        curve.setAttributeNS(null, "fill", "none");
        //curve.setAttributeNS(null, "stroke-location", "center");


        var shape: SVGElement = <SVGElement>document.createElementNS(svgns, "line");
	    shape.setAttributeNS(null, "x1", String(x));
        shape.setAttributeNS(null, "y1", String(y));
        shape.setAttributeNS(null, "x2", String(x));
        shape.setAttributeNS(null, "y2", String(y));
        shape.setAttributeNS(null, "stroke", "black");
        shape.setAttributeNS(null, "stroke-width", "5");
        this.connector.connectorShape = <ConnectorShape>curve;

        document.getElementById("svgCanvas").appendChild(curve);
        //document.getElementById("svgCanvas").appendChild(shape);
    }

    stopDraggingConnection(sourceModule: ModuleClass, destination: ModuleClass):void {


        if (sourceModule.moduleView.getInterfaceContainer().lastLit) {
            sourceModule.moduleView.getInterfaceContainer().lastLit.className = sourceModule.moduleView.getInterfaceContainer().lastLit.unlitClassname;
            sourceModule.moduleView.getInterfaceContainer().lastLit = null;
	    }

        sourceModule.moduleView.getInterfaceContainer().className = sourceModule.moduleView.getInterfaceContainer().unlitClassname;

        var x: number, y: number
        if (destination) {	

		    // Get the position of the originating connector with respect to the page.

            var offset: HTMLElement;
            if (!this.originIsInput)
                offset = destination.moduleView.getInputNode();
            else
                offset = destination.moduleView.getOutputNode();

            var toElem: HTMLElement = offset;
	

	    // Get the position of the originating connector with respect to the page.			
            x = window.scrollX + destination.moduleView.inputOutputNodeDimension / 2;
            y = window.scrollY + destination.moduleView.inputOutputNodeDimension / 2;

            while (offset) {
                x += offset.offsetLeft;
                y += offset.offsetTop;
                offset = <HTMLElement> offset.offsetParent;
		    }

            var x1 = this.cursorStartX;
            var y1 = this.cursorStartY;
            var x2 = x;
            var y2 = y;
            var d = this.setCurvePath(x1, y1, x2, y2, this.calculBezier1(x1, x2), this.calculBezier2(x1, x2))
            this.connector.connectorShape.setAttributeNS(null, "d", d);
            this.updateConnectorShapePath(this.connector.connectorShape, x1, x2, y1, y2);

            //this.connector.connectorShape.setAttributeNS(null, "x2", String(x));
            //this.connector.connectorShape.setAttributeNS(null, "y2", String(y));

            var src: ModuleClass, dst: ModuleClass;

		    // If connecting from output to input
		    if (this.originIsInput) {
		
			    if (toElem.classList.contains("node-output")) {
				    src = destination;
				    dst = sourceModule;
			    }
		    }		
		    else {
			    if (toElem.classList.contains("node-input")) {

                    // Make sure the connector line points go from src->dest (x1->x2)
                    var d = this.setCurvePath(x2, y2, x1, y1, this.calculBezier1(x1, x2), this.calculBezier2(x1, x2))
                    this.connector.connectorShape.setAttributeNS(null, "d", d);
                    this.updateConnectorShapePath(this.connector.connectorShape,x2, x1, y2, y1);


        //            var shape: ConnectorShape = this.connector.connectorShape;
				    //x = parseFloat(shape.getAttributeNS(null, "x2"));
        //            y = parseFloat(shape.getAttributeNS(null, "y2"));
			     //   shape.setAttributeNS(null, "x2", shape.getAttributeNS(null, "x1"));
	    		 //   shape.setAttributeNS(null, "y2", shape.getAttributeNS(null, "y1"));
				    //shape.setAttributeNS(null, "x1", String(x));
        //            shape.setAttributeNS(null, "y1", String(y));


				
				    // can connect!
				    // TODO: first: swap the line endpoints so they're consistently x1->x2
				    // That makes updating them when we drag nodes around easier.

                    src = sourceModule;
                    dst = destination;
			    }
		    }
		
            if (src && dst) {
			    

                var connector: Connector = new Connector();
                connector.connectModules(src, dst);

                dst.moduleFaust.addInputConnection(connector);
                src.moduleFaust.addOutputConnection(connector);

                this.connector.destination = dst;
                this.connector.source = src;
                var drag: Drag = this
                connector.saveConnection(src, dst, this.connector.connectorShape);
                this.connector.connectorShape.onclick = function (event) { connector.deleteConnection(event,drag) };

			    //this.connectorShape = null;
                
                

			    return;
		    }
	    }

        // Otherwise, delete the line
        this.connector.connectorShape.parentNode.removeChild(this.connector.connectorShape);
        this.connector.connectorShape = null;
    }

    startDraggingConnector(module: ModuleClass, event: MouseEvent):void {
        this.startDraggingConnection(module, <HTMLElement>event.target);

        // Capture mousemove and mouseup events on the page.
        module.addCnxListener(<HTMLElement>event.target, "mousemove", module);
        module.addCnxListener(<HTMLElement>event.target, "mouseup",module);

        //event.preventDefault();
	    //event.stopPropagation();
    }



    whileDraggingConnector(module: ModuleClass, event: MouseEvent) {

        var toElem: HTMLInterfaceContainer = <HTMLInterfaceContainer>event.target;

        // Get cursor position with respect to the page.
        var x1: number = this.cursorStartX;
        var y1: number = this.cursorStartY;
        var x2: number = event.clientX + window.scrollX;
        var y2: number = event.clientY + window.scrollY;
        var d: string;
        if (!this.originIsInput) {
            d = this.setCurvePath(x1, y1, x2, y2, this.calculBezier1(x1, x2), this.calculBezier2(x1, x2))
        } else {
            d = this.setCurvePath(x1, y1, x2, y2, this.calculBezier1(x1, x2), this.calculBezier2(x1, x2))
        }
        // Move connector visual line
        this.connector.connectorShape.setAttributeNS(null, "d", d);



        if (toElem.classList) {	// if we don't have class, we're not a node.
	        // if this is the green or red button, use its parent.
	        if (toElem.classList.contains("node-button"))
                toElem = <HTMLInterfaceContainer>toElem.parentNode;

	        // if we're over our originating node, do nothing.
	        if (toElem == this.elemNode)
	    	    return;
		
		    // If we used to be lighting up a node, but we're not over it anymore,
		    // unlight it.
		    if (this.lastLit && (this.lastLit != toElem ) ) {
			    this.lastLit.className = this.lastLit.unlitClassname;
			    this.lastLit = null;
		    }

		    // light up connector point underneath, if any
		    if (toElem.classList.contains("node")) {
			    if (!this.lastLit || (this.lastLit != toElem )) {
				    if (this.originIsInput) {
					    if (toElem.classList.contains("node-output")) {
						    toElem.unlitClassname = toElem.className;
						    toElem.className += " canConnect";
						    this.lastLit = toElem;
					    }
				    } else {	// first node was an output, so we're looking for an input
					    if (toElem.classList.contains("node-input")) {
						    toElem.unlitClassname = toElem.className;
						    toElem.className += " canConnect";
						    this.lastLit = toElem;
					    }
				    }
			    }
		    }
	    }
        event.preventDefault();
	    event.stopPropagation();
    }

    stopDraggingConnector(module: ModuleClass, event:MouseEvent):void {

  	    // Stop capturing mousemove and mouseup events.
        module.removeCnxListener(<HTMLElement>event.target, "mousemove",module);
        module.removeCnxListener(<HTMLElement>event.target, "mouseup", module);
        var arrivingHTMLNode: HTMLElement = <HTMLElement>event.target;
        var arrivingHTMLParentNode: HTMLElement = <HTMLElement>arrivingHTMLNode.offsetParent;
        var arrivingNode: ModuleClass;

        var modules: ModuleClass[] = module.sceneParent.getModules();

        for (var i = 0; i < modules.length; i++){
            if ((this.originIsInput && modules[i].moduleView.isPointInOutput(event.clientX, event.clientY)) || modules[i].moduleView.isPointInInput(event.clientX, event.clientY)) {
			    arrivingNode = modules[i];
			    break;
		    }
	    }	

        if (!arrivingNode && arrivingHTMLParentNode != undefined) {
            var outputModule = module.sceneParent.getAudioOutput();
            var inputModule = module.sceneParent.getAudioInput();
            if ((this.originIsInput && outputModule.moduleView.isPointInOutput(event.clientX, event.clientY)) || outputModule.moduleView.isPointInInput(event.clientX, event.clientY) || arrivingHTMLParentNode.offsetParent.getAttribute("id") == "moduleOutput") {
                arrivingNode = outputModule;
            } else if ((!this.originIsInput && inputModule.moduleView.isPointInInput(event.clientX, event.clientY)) || inputModule.moduleView.isPointInOutput(event.clientX, event.clientY) || arrivingHTMLParentNode.offsetParent.getAttribute("id") == "moduleInput") {
                arrivingNode = inputModule;
            }
        }
        module.drag.stopDraggingConnection(module, arrivingNode);
    }

}

