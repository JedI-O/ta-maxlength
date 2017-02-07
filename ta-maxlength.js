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

        var getTruncatedContent = function(content) {
          return content.substr(0, maxLength);
        };

        var getEditor = function() {
          return editor.scope.displayElements.text[0];
        };

        var getContentLength = function() {
          return angular.element(getEditor()).text().length;
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
            }

            getEditor().addEventListener('keydown', function(e) {
              if(!isNavigationKey(e.keyCode) && !isCopying(e) && (getContentLength() >= maxLength)) {
                e.preventDefault();
                return false;
              }
            });

            getEditor().addEventListener('click', function(e) {
              var remainingChars = maxLength - getContentLength();
              var charCountDiv = angular.element(document.querySelector('#taInnerCharCount'+editorID));

              if(remainingChars == 0) {
                charCountDiv.html('<span style="color: darkred;">' + remainingChars + ' ' + $translate.instant('CHARACTERS_LEFT') + '</span>');
              } else {
                charCountDiv.html(remainingChars + ' ' + $translate.instant('CHARACTERS_LEFT'));
              }
            });
          }

          return editorInstance === undefined ? '' : editor.scope.html;
        }, function(modifiedContent) {
          if(getContentLength() > maxLength) {
            $timeout(function() {
              console.log('getting truncated content:', getTruncatedContent(modifiedContent));
              editor.scope.html = getTruncatedContent(modifiedContent);
            });
          }

          var charCountDiv = angular.element(document.querySelector('#taInnerCharCount'+editorID));
          var remainingChars = maxLength - getContentLength();

          //possible if some text was copied and pasted
          if(remainingChars < 0) {
            //build dom stack
            var domStack = [];

            //parse html text
            var strippedText = '';
            var printedChars = 0;
            var parseMode = 'text';
            var tagName = '';
            for(var i=0; i<editor.scope.html.length; i++) {
              var currentChar = editor.scope.html[i];
              var nextChar = (i<editor.scope.html.length-1) ? editor.scope.html.length[i+1] : '';
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
                  printedChars++;

                  if(printedChars == maxLength) {
                    //close remaining tags and stop
                    domStack = domStack.reverse();
                    domStack.forEach(function(tag) {
                      strippedText += '</' + tag + '>';
                    });
                    domStack = [];
                    break;
                  }
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

            console.log('stripped text:', strippedText);

            editor.scope.html = '<b>Pfannkuchen</b>'; //strippedText;
            remainingChars = 0;
          }

          if(remainingChars == 0) {
            charCountDiv.html('<span style="color: darkred;">' + remainingChars + ' ' + $translate.instant('CHARACTERS_LEFT') + '</span>');
          } else {
            charCountDiv.html(remainingChars + ' ' + $translate.instant('CHARACTERS_LEFT'));
          }
        });
      }
    };
  });
