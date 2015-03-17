console.log('Initiated.');

//////////////////////
// Button Container //
//////////////////////
var ButtonContainer = React.createClass({displayName: "ButtonContainer",

	_handlePageClose: function(e) {
		this.props.handlePageClose(this.props.thisIndex);
	},

	render: function() {

		var closeButton,
			 currentButton,
			 outerButtonContainerStyle = {
			 	width: 0,
				marginRight: this.props.position === 'fixed' ? this.props.window.scrollLeft() : 0,
			 },
			 innerButtonContainerStyle = {
			 	position: this.props.position,
			 };

		if (this.props.thisIndex !== 0) {
			var width = 53;
			outerButtonContainerStyle.width += width;
			
			closeButton = React.createElement("button", {style: {width: width}, className: "newwiki-button newwiki-closeButton", type: "button", onClick: this._handlePageClose}, 
	           "Close"
	       );
		}

		if (this.props.isCurrentDocument && !this.props.isOnlyDocument) {
			var width = 67;
			outerButtonContainerStyle.width += width;

			var currentButton = React.createElement("button", {style: {width: width}, className: "newwiki-button newwiki-currentButton", type: "button"}, 
	           "Current"
	       );
		}

		return (
			React.createElement("div", {style: outerButtonContainerStyle, className: "newwiki-outerButtonContainer"}, 
				React.createElement("div", {style: innerButtonContainerStyle, className: "newwiki-innerButtonContainer"}, 
					currentButton,
					closeButton
				)
			)
		);
	}

});

///////////////////////////////////
// Individual document (or page) //
///////////////////////////////////
var Document = React.createClass({displayName: "Document",

	_domNode: null,
	_window: $(window),

	componentDidMount: function() {
		console.log('New page mounted.');
		this._domNode = $(this.refs.thisPage.getDOMNode());

		this._domNode.offset({top: this.props.document.offset});
		this.forceUpdate();
	},

	componentDidUpdate: function() {
		this._domNode.offset({top: this.props.document.offset});
	},

	_handleClick: function(e) {
		var a;

		if (e.target.tagName === "A") {
			a = e.target;
		} else {
			var levelUp = $(e.target).parents('a');
			if (levelUp.length > 0) {
				a = levelUp.get(0);
			}
		}

		if (a) {
			var href = a.getAttribute('href');
		}

		if (e.shiftKey && a && href && href.indexOf('/wiki/') === 0) {
			this.props.handleNewPage(href, this.props.thisIndex);
			e.preventDefault();
		} else {
			this.props.handleMakePageActive(this.props.thisIndex);
		}
	},

	_generateButtons: function() {
		if (!this._domNode) {
			return null;
		}

		var buttonContainerPosition = this._window.scrollTop() < this.props.document.offset ? "absolute" : "fixed";
		var rightSide = this._domNode.offset().left + this._domNode.width();

		return React.createElement(ButtonContainer, {
			window: this._window,
			position: buttonContainerPosition,
			rightSide: rightSide,
			isCurrentDocument: this.props.isCurrentDocument,
			thisIndex: this.props.thisIndex,
			isOnlyDocument: this.props.isOnlyDocument,
			handlePageClose: this.props.handlePageClose, 
		});
	},

	render: function() {
		var style = {
			width: this.props.width,
		};

		return (
			React.createElement("div", {style: style, className: 'newwiki-page', ref: 'thisPage'}, 
				this._generateButtons(),
				React.createElement("div", {onClick: this._handleClick, dangerouslySetInnerHTML: {__html: this.props.document.html}})
			)
		);
	},
});

//////////////////////////////////////////////////////
// The app container. This holds all the documents. //
//////////////////////////////////////////////////////
var AppContainer = React.createClass({displayName: "AppContainer",

	_pageId: 0,
	_lastScrollTop: 0,
	_lastScrollLeft: 0,
	_originalScrollTop: [0],
	_contentHeight: 0,
	_originalContentwidth: $("#content").width(),
	_cache: {
		window: $(window),
		container: $("#content"),
	},
	_maxOffset: function(offset) {
		if (!offset) offset = 0;
		var minOffset = this._cache.container.offset().top + parseInt(this._cache.container.css("padding-top"));
		return Math.max(minOffset, offset);
	},

	getInitialState: function() {
		var minOffset = this._maxOffset();

		var initialDoc = {
			id: this._pageId++,
			// top: 0,
			// originalTop: 0,
			offset: minOffset,
			originalOffset: minOffset,
			html: $('#content').html()
		};

		return {
			documents: [initialDoc],
			currentDocument: 0,
			documentsPerPage: self.options.articlesPerPage,
		};
	},

	componentDidUpdate: function() {
		// We may need to update the outer container width
		var width = Math.max(this.state.documentsPerPage, this.state.documents.length);
		var contentWidth = (width / this.state.documentsPerPage) * this._originalContentwidth;
		this._cache.container[0].style.width = contentWidth+"px";
	},

	componentDidMount: function() {
		this._cache.window.scroll(function(e) {
			this._handleScroll();
		}.bind(this));

		this._cache.container.css({"white-space": "nowrap"})

		// Listen for settings changes
		self.port.on("prefchange", function(documentsPerPage) {
			this.setState({documentsPerPage: documentsPerPage});
		}.bind(this));
	},

	_handleScroll: function() {
			var scrollTop = Math.round(this._cache.window.scrollTop()),
			scrollLeft = Math.round(this._cache.window.scrollLeft()),
			difference = this._originalScrollTop.map(function(value) {
				return scrollTop - this._maxOffset(value);
			}, this),
			currentHasReachedTop = false,
			currentHasReachedBottom = false,
			currentDOMNode = $(this.refs[this.state.currentDocument].getDOMNode()),
			currentTopOffset = this.state.documents[this.state.currentDocument].offset,
			documents = [],
			changeBy;

			// Don't do anything if there wasn't actually a scroll (some browsers may do decimal-precision scrolling)
			if (scrollTop === this._lastScrollTop && scrollLeft === this._lastScrollLeft) return;
			this._lastScrollLeft = scrollLeft;

			// Up or down?
			var direction = (scrollTop - this._lastScrollTop) > 0 ? "down" : "up";
			this._lastScrollTop = scrollTop;

			if (scrollTop < currentTopOffset) {
				currentHasReachedTop = true;
			}

			if (scrollTop > (currentTopOffset + currentDOMNode.outerHeight() - this._cache.window.height() + 200)) {
				currentHasReachedBottom = true;
			}

			var highestContentHeightRequired = 0;
			var anyDocumentHasReachedBottom;

			this.state.documents.forEach(function(doc, index) {

				var docHasReachedTop = false,
				    docHasReachedBottom = false;

				if (scrollTop < doc.offset) {
					docHasReachedTop = true;
				}
				if (scrollTop > (doc.offset + this.refs[index].getDOMNode().scrollHeight - this._cache.window.height() + 200)) {
					docHasReachedBottom = true;
					anyDocumentHasReachedBottom = anyDocumentHasReachedBottom || true;
				}

				var minOffset = this._maxOffset();

				if (scrollTop < minOffset) {
					doc.offset = minOffset;
					doc.originalOffset = minOffset;
					this._originalScrollTop[index] = minOffset;
				} else if (index !== this.state.currentDocument) {

					if (currentHasReachedTop && direction === "down") {
						// Do nothing
					} else if (currentHasReachedTop && direction === "up" && !docHasReachedTop) {
						this._originalScrollTop[index] = this._cache.window.scrollTop();
						doc.originalOffset = doc.offset;
					} else if (currentHasReachedBottom && direction === "down" && !docHasReachedBottom) {
						this._originalScrollTop[index] = this._cache.window.scrollTop();
						doc.originalOffset = doc.offset;
					} else if (currentHasReachedBottom && direction === "up") {
						// Do nothing
					} else {
						// All other conditions must change top
						doc.offset = doc.originalOffset + difference[index];
					}
				} else {
					if (currentHasReachedTop && direction === "up") {
						doc.originalOffset = this._maxOffset(scrollTop);
						doc.offset = doc.originalOffset;
					} else if (currentHasReachedBottom && direction === "down") {
						doc.offset = scrollTop - currentDOMNode.outerHeight() + this._cache.window.height() - 200;
					}
				}

				// The outer container height needs to be set to the maximum height required.
				// Otherwise it's ends up short on the bottom.
				var offsetPlusHeight = doc.offset - this._maxOffset() + this.refs[index].getDOMNode().scrollHeight;
				if (offsetPlusHeight > highestContentHeightRequired) {
					highestContentHeightRequired = offsetPlusHeight;
				}

				documents.push(doc);

			}.bind(this));

			this.setState({documents: documents}, function() {
				// Don't update ALL the time, only when necessary
				if (anyDocumentHasReachedBottom && this._contentHeight !== highestContentHeightRequired) {
					this._cache.container[0].style.height = highestContentHeightRequired+"px";
					this._contentHeight = highestContentHeightRequired;
				}
			});
		},

		_handleNewPage: function(destination, currentIndex) {
			var newIndex = currentIndex + 1;

			console.log('Loading destination ' + destination + '...');

			var get = $.get(destination);

			get.done(function(html) {
				var html = $('<div/>').append(html);
				html.find(".firstHeading").attr("style", "display: block !important;");
				html = html.find("#content").html();

				var top = this._maxOffset(Math.round(this._cache.window.scrollTop()));

				var newDocument = {
					id: this._pageId++,
					originalOffset: top,
					offset: top,
					html: html,
				};

				var documents = this.state.documents;

				documents.splice(newIndex, 999);

				documents.push(newDocument);

				console.log('Adding new document to page...');

				this.setState({
					documents: documents,
				}, function() {
					this._handleMakePageActive(newIndex);

					if (documents.length > this.state.documentsPerPage) {
					    var left = $(document).outerWidth();
					    $('html').animate({ scrollLeft: left}, 1000);
					}
				});

			}.bind(this));

			get.fail(function( jqXHR, textStatus ) {
				console.log('Could not load new wikipedia page.');
				console.log(jqXHR);
				console.log(textStatus);
			});
		},

		_handleMakePageActive: function(index) {
			console.log('Make page active...')
			var documents = [];

			this.state.documents.forEach(function(doc) {
				doc.originalOffset = doc.offset;

				documents.push(doc);
			});

			this._originalScrollTop = this.state.documents.map(function() {
				return this._cache.window.scrollTop();
			}, this);

			// Set the height of the outer container.
			var highestContentHeightRequired = 0;
			for (var i = 0; i < documents.length; i++) {
				var offsetPlusHeight = documents[i].offset - this._maxOffset() + this.refs[i].getDOMNode().scrollHeight;
				if (offsetPlusHeight > highestContentHeightRequired) {
					highestContentHeightRequired = offsetPlusHeight;
				}
			}

			if (highestContentHeightRequired !== this._contentHeight) {
				this._cache.container[0].style.height = highestContentHeightRequired+"px";
				this._contentHeight = highestContentHeightRequired;
			}

			this.setState({
				documents: documents,
				currentDocument: index,
			});
		},

		_handlePageClose: function(thisIndex) {
		    var documents = this.state.documents.slice(0, thisIndex);

		    // If only one page left, mput the page up top.
		    // Otherwise there will be a blank space up top.
		    if (documents.length === 1) {
		    	var currentPositionOffset = this._cache.window.scrollTop() - documents[0].offset;
		      documents[0].offset = documents[0].originalTop = this._maxOffset();
		    }

		    this.setState({
		    	documents: documents,
		    }, function() {
		    	if (typeof(currentPositionOffset) !== 'undefined') {
		    		this._cache.window.scrollTop(documents[0].offset + currentPositionOffset);
		    	}

		    	this._handleMakePageActive(thisIndex - 1);
		    });
		},

		render: function() {

			var divWidth = this._originalContentwidth / Math.min(this.state.documents.length, this.state.documentsPerPage);

			return (
				React.createElement("div", {ref: "innerContainer", className: "newwiki-innerContainer"}, 
                 this.state.documents.map(function(doc, key, allDocuments) {
  						return React.createElement(Document, {
  							key: doc.id, 
  							thisIndex: key, 
  							ref: key, 
  							isCurrentDocument: key === this.state.currentDocument, 
  							isOnlyDocument: allDocuments.length === 1,
  							document: doc, 
  							width: divWidth, 
  							handleNewPage: this._handleNewPage, 
  							handlePageClose: this._handlePageClose, 
  							handleMakePageActive: this._handleMakePageActive
  						})
  					}.bind(this))
				)
			);
		}
	});

///////////////
// Let's go! //
///////////////
React.render(React.createElement(AppContainer, null), document.getElementById('content'));