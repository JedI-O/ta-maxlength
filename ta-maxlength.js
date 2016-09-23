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
                    return $.truncate(content, {
                        length: maxLength + 1,
                        ellipsis: ''
                    });
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
                    }

                    return editorInstance === undefined ? '' : editor.scope.html;
                }, function(modifiedContent) {
                    if(getContentLength() > maxLength) {
                        $timeout(function() {
                            editor.scope.html = getTruncatedContent(modifiedContent);
                        });
                    }

                    var charCountDiv = angular.element(document.querySelector('#taInnerCharCount'+editorID));
                    var remainingChars = maxLength - getContentLength();
                    if(remainingChars < 0) {
                      //possible if some text was copied and pasted
                      editor.scope.html = editor.scope.html.substr(0, maxLength+3);
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
