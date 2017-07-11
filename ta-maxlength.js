'use strict';

angular
  .module('ta-maxlength', [])
  .directive('taMaxlength', function ($timeout, textAngularManager, $translate) {
    return {
      restrict: 'A',
      link: function ($scope, element, attrs) {
        var editor, editorID, editorContainer, maxLength = parseInt(attrs.taMaxlength);
        var initDone = false;

        if(isNaN(maxLength)) {
          console.warn('Invalid number for ta-maxlength, automatically set to POSITIVE_INFINITY');
          maxLength = Number.POSITIVE_INFINITY;
        }

        var parseContent = function(content, returnValue) {
          //rangy span --> should better not be manipulated
          /*var rangySpanRegex = /<span id="selectionBoundary_[0-9]+_[0-9]+" class="rangySelectionBoundary"><\/span>/;
          var rangySpan = content.match(rangySpanRegex);*/

          //remove zero-width no break spaces
          content = content.replace(new RegExp('&#65279;', 'g'), '');

          //remove empty paragraphs if existing at the beginning
          if(content.indexOf('<p></p>') == 0) {
            content = content.substr(7);
          }

          //build dom stack
          var domStack = [];

          //parse html text
          var strippedText = '';
          var printedChars = 0;
          var parseMode = 'text';
          var tagName = '';

          for(var i=0; i<content.length; i++) {
            var currentChar = content[i];
            var nextChar = (i<content.length-1) ? content.length[i+1] : '';
            strippedText += currentChar;

            if(currentChar == '<') {
              if(nextChar == '/') {
                domStack.pop();
                parseMode = 'ignoreHTML';
              } else {
                parseMode = 'findTagName';
              }
            } else {
              if(parseMode == 'text') {
                if(currentChar == '&') {
                  parseMode = 'htmlSpecialChar';
                } else {
                  printedChars++;

                  if(printedChars == maxLength) {
                    //close remaining tags and stop
                    domStack = domStack.reverse();
                    for(var domStackIndex=0; domStackIndex<domStack.length; domStackIndex++) {
                      var tag = domStack[domStackIndex];
                      strippedText += '</' + tag + '>';
                    }
                    domStack = [];

                    switch(returnValue) {
                      case 'strippedText':
                        return strippedText;
                      case 'charCount':
                        return printedChars;
                    }
                  }
                }
              } else if(parseMode == 'htmlSpecialChar') {
                if(currentChar == ';') {
                  printedChars++;
                  parseMode = 'text';
                }
                //if no semicolon, HTML special char is still parsed; do nothing
              } else if(parseMode == 'findTagName') {
                if(currentChar == '>') {
                  //tag closes
                  domStack.push(tagName);
                  tagName = '';
                  parseMode = 'text';
                } else if(currentChar == ' ') {
                  //attributes after tag name
                  domStack.push(tagName);
                  tagName = '';
                  parseMode = 'ignoreHTML';
                } else if(currentChar == '/') {
                  //self closing tags
                  tagName = '';
                  parseMode = 'ignoreHTML';
                } else {
                  //letters of tag name
                  tagName += currentChar;
                }
              } else if(parseMode == 'ignoreHTML') {
                if(currentChar == '>') {
                  parseMode = 'text';
                }
              }
            }
          }

          switch(returnValue) {
            case 'strippedText':
              return strippedText;
            case 'charCount':
              return printedChars;
          }
        };

        var stripContent = function(content) {
          return parseContent(content, 'strippedText');
        };

        var updateRemainingChars = function() {
          var charCountDiv = angular.element(document.querySelector('#taInnerCharCount'+editorID));
          var remainingChars = maxLength - getContentLength(editor.scope.html);

          //should actually never occur, but just in case...
          if(remainingChars < 0) {
            editor.scope.html = stripContent(editor.scope.html);
            remainingChars = 0;
          }

          if(remainingChars == 0) {
            charCountDiv.html('<span style="color: darkred;">' + remainingChars + ' ' + $translate.instant('CHARACTERS_LEFT') + '</span>');
          } else if(remainingChars <= 15) {
            charCountDiv.html('<span style="color: sienna;">' + remainingChars + ' ' + $translate.instant('CHARACTERS_LEFT') + '</span>');
          } else {
            charCountDiv.html(remainingChars + ' ' + $translate.instant('CHARACTERS_LEFT'));
          }
        };

        var getEditor = function() {
          return editor.scope.displayElements.text[0];
        };

        var getContentLength = function(content) {
          return parseContent(content, 'charCount');
        };

        var isNavigationKey = function(keyCode) {
          return ((keyCode >= 33) && (keyCode <= 40)) || ([8, 46].indexOf(keyCode) !== -1);
        };

        var isCopying = function(event) {
          return event.ctrlKey && ([65, 67, 88].indexOf(event.keyCode) !== -1);
        };

        $scope.$watch(function() {
          var editorInstance = textAngularManager.retrieveEditor(attrs.name);

          if((editorInstance !== undefined) && (editor === undefined)) {
            editor = editorInstance;

            if(!initDone) {
              //create DIV
              editorID = editor.scope.displayElements.text[0].id.substr(13);
              editorContainer = angular.element(document.querySelector('#taTextElement'+editorID));
              editorContainer.parent().append('<div id="taInnerCharCount'+editorID+'" class="taInnerCharCount"></div>');
              initDone = true;
              updateRemainingChars();
            }

            getEditor().addEventListener('keydown', function(e) {
              if(!isNavigationKey(e.keyCode) && !isCopying(e) && (getContentLength(editor.scope.html) >= maxLength)) {
                e.preventDefault();
                return false;
              }
            });

            getEditor().addEventListener('click', function() {
              updateRemainingChars();
            });
          }

          if(editorInstance === undefined) {
            return '';
          } else if(editor.scope.html.trim() === '') {
            $scope.deferred.resolve(true);
            return '';
          } else {
            return editor.scope.html;
          }
        }, function() {
          var content = editor.scope.html;

          //check if text is too long
          var tmp = document.createElement('DIV');
          tmp.innerHTML = content;
          var contentLength = (tmp.textContent || tmp.innerText || '').length;
          if(contentLength > maxLength) {
            //strip HTML content
            editor.scope.html = stripContent(content);
          }
          updateRemainingChars();
        });
      }
    };
  });