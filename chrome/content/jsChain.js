/**
 * jsChain 
 * Author: rereaydou Version: 0.0.1 Date: 8/3/2012
 * All the functionality should based on JSD(Javascript Debugger Service)
 */

 var jsChain = function(){
		return {
			tracing: false,
			jsChain: {name: 'jsDog', fn: {file: 'jsDog', line: 0, args: ''}, parentNode: null, subfuncs: []},
			callStack: [],//push and pop functions
			jsChainCallFlow: '',
			run: function(){

				this.tracing = !this.tracing;
				const Cc = Components.classes;
				const Ci = Components.interfaces;
				const hook = Ci.jsdICallHook;
				const funcCALL= hook.TYPE_FUNCTION_CALL; //2
				const funcRTN = hook.TYPE_FUNCTION_RETURN; //3
	
				//Components.utils.reportError('components utils report error');
				//Application.console.log('damn it');
				var console = this.console = Application.console;
				// javascript debugger service
				this.jsd = Cc["@mozilla.org/js/jsd/debugger-service;1"]
									 .getService(Ci.jsdIDebuggerService);

				//check to stop
				if(!this.tracing)
				{
					this.stop();
					return;
				}
				
				var self = this;	
					if(self.jsd.asyncOn)
					{
						self.jsd.asyncOn({onDebuggerActivated: function(){
								console.log('Debugging working');
							}
						});
					}
					else
					{
						self.jsd.on();
					}//enable debugger service
					
					this.jsd.clearFilters();
					//ignore the sys functions
					this.jsd.appendFilter(this.create_filter("*/firefox/components/*"));
					this.jsd.appendFilter(this.create_filter("*/firefox/modules/*"));
					this.jsd.appendFilter(this.create_filter("XStringBundle"));
					this.jsd.appendFilter(this.create_filter("chrome://*"));
					this.jsd.appendFilter(this.create_filter("x-jsd:ppbuffer*"));
					this.jsd.appendFilter(this.create_filter("XPCSafeJSObjectWrapper.cpp"));
					this.jsd.appendFilter(this.create_filter("file://*"));
					this.jsd.appendFilter(this.create_filter("resource://*"));


					self.jsd.debugHook = {
						onExecute: function(frame, type, rv){
								
								stackTrace = "";
								for(var f = frame; f; f = f.callingFrame){
									stackTrace = 'Exe::: '+f.script.fileName + "@" + f.line + "@" + f.functionName + "\n";
								}
								//dump(stackTrace);
								console.log(stackTrace);
								return Ci.jsdIExecutionHook.RETURN_CONTINUE;
								
							}
						};
					
					//get running functions
					
					var _jsChainHook = {
						onCall: function(frame, type){
							var stackTrace = "";
							//for(var f = frame; f; f = f.callingFrame){
									if(frame && frame.functionName && frame.script)
									{
										var f = frame;
										var scriptName  = f.script.fileName;
										var funcName	= f.functionName;
										var line		= f.line;
										var exeTime		= f.script.maxExecutionTime;
										var funcSrc		= f.script.functionSource
										var args		= self.get_func_args(funcSrc);

										if(funcName && funcName === 'anonymous')
										{
											return;
										}
									
										console.log(funcSrc);
										console.log(args);

										if(funcName[0] != '$' && !f.isDebugger)
										{
											if(type === funcCALL)
											{														
												var node = new self.jsChainNode(funcName, {file:scriptName, line: line, args: args}, []);
												if(!node)
												{
													console.log('Create function call node failed!');
													return;
												}
												self.callStack.push(node);

												//console.log('stack '+self.callStack.length+' :'+node.name);

												if(self.callStack.length === 1)
												{
													self.jsChain.subfuncs.push(node);
													node.parentNode = self.jsChain;
												}
												else
												{
													var pNode= self.callStack[self.callStack.length-2];
													self.add_subfunc(pNode, node);
													//console.log(pNode.name+' is p of '+node.name);
												}
												//console.log('funcCALL');

											}

											if(type === funcRTN)
											{
												
												var root = self.callStack.pop();
												if(self.callStack.length === 0)
												{
													//self.jsChain.subfuncs.push(root);
												}
												//console.log('funcRTN');
											}
											//console.log("name: "+f.script.fileName+", funcName@ "+frame.functionName+', type@'+type);
										}
									}
													
								}
					};
				self.jsd.functionHook = _jsChainHook;
				//self.jsd.topLevelHook = _jsChainHook;

				if(!this.jsChainDiv){
					this.create_div('jsChainPanel');
				}

				_that = this;
				content.onmousemove = function(event){
						var m = _that.get_mouse(event);
						_that.pop_div(m);
					};
				content.onclick = function(event){
						//content.onmousemove = null;
						//console.log(this.callee);
						var o = event.target;
						//console.log("script: "+o.scriptName+" , @line: "+o.lineNumber);
					};
			},

			stop: function(){
				if(!this.tracing)
				{
					content.onmousemove = null;
					this.jsChainDiv.style.display = 'none';
					content.document.body.removeChild(content.document.body.lastChild);
					this.jsChainDiv = null;
					this.jsd.off();
					this.jsd = null;
					//this.jsChainCallFlow = '';

					var str = this.travel_chain(this.jsChain);
					
					Application.console.log('str=== '+str);
					this.jsChainCallFlow = str;
					this.jsChain = {name: 'jsDog', fn: {file: 'jsDog', line: 0, args: ''}, parentNode: null, subfuncs: []};
					this.callStack = [];

					return;
				}
			},

			// a func node
			jsChainNode: function(name, fn, subfuncs){
					this.name	= name;
					this.fn		= fn;
					this.parentNode	= null;
					this.subfuncs	= subfuncs;	
					//Application.console.log('new node: '+name);
					//Application.console.log(fn.funcSrc);
				},
			//add node to some func call's subfunc;
			add_subfunc: function(pNode, cNode){

					pNode.subfuncs.push(cNode);
					cNode.parentNode = pNode;
				},

			create_filter: function(pattern, pass){
					var jsdIFilter = Components.interfaces.jsdIFilter;
					var filter = {
									globalObject: null,
									flags: pass ? (jsdIFilter.FLAG_ENABLED | jsdIFilter.FLAG_PASS) : jsdIFilter.FLAG_ENABLED,
									urlPattern: pattern,
									startLine: 0,
									endLine: 0
								};
					return filter;
				},

			travel_chain: function(root){
					var str = root.name + '(' +root.fn.args + ')';
					//var self = this;
					//var selfCall = arguments.callee;
					// here should check root type
					//return selfCall;
					//Application.console.log('in travel :'+root.subfuncs.length);
					var subfuncs = root.subfuncs;
					for(var e in subfuncs)
					{
						//Application.console.log('sub ... '+e);
						str += ', '+arguments.callee(subfuncs[e]);
					}
					return str;
				},
			//cause no api function to get function arguments
			get_func_args: function(funcSrc){
					var argExp = /function\s([\w\s\d_\$]*)\(([\w\s\d_\$,]*)\)/i;
					var matchs = argExp.test(funcSrc);
					//Application.console.log(funcSrc);
					//Application.console.log(matchs[1]);
					return RegExp.$2;
				},

			get_mouse: function(event){
					this.mouse = mouse = {	x: event.pageX,
											y: event.pageY
										};
					return mouse;
				},
			
			create_div: function(id){
					var div = content.document.createElement('div');
						div.id = id;
						div.style.zIndex	= '9999';
						div.style.width		= '200px';
						div.style.height	= 'auto';
						//font
						//div.style.color		= '#ffff00';
						div.style.display	= 'none';
						div.style.backgroundColor = 'rgba(255,255,255,0.4)';
						div.style.border	= '1px solid rgb(77, 144, 254)';
						div.style.boxShadow = '2px -1px 4px rgba(0, 0, 0, 0.2)';
						div.style.padding	= '5px';
						div.style.position	= 'absolute';
					this.jsChainDiv = div;
					content.document.body.appendChild(div);
				},

			pop_div: function(pos){
					var div = this.jsChainDiv;
						div.style.top		= pos.y+5+'px';
						div.style.left		= pos.x+5+'px';
						div.style.display	= 'block';

						var str = '';
						for(var e in content.console)
						{
							str += (typeof content.console[e]);
							str += e;
							str += '<br>';
						}

						content.document.getElementById('jsChainPanel').innerHTML = 'jsChain tracing... x '+pos.x+', y'+pos.y+' <br>'+this.jsChainCallFlow;
						
				}
		};
 }();

// var jsc = new jsChain();
 
// jsc.run();