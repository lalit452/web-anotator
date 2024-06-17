window.addEventListener('load', () => {
  chrome.storage.local.get(['highlights'], (result) => {
    const highlights = result.highlights || [];
    console.log('Highlights from storage:', highlights);

    highlights.forEach((highlight) => {
      if (highlight.page === window.location.href) {
        const parentNode = getNodeByXPath(highlight.parentXPath);
        console.log('Parent node:', parentNode);

        if (parentNode) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = highlight.html;
          const highlightElement = tempDiv.firstChild;

          if (highlightElement) {
            highlightElement.title = highlight.noteName; // Set the note name for hover display

            const childIndex = Math.min(highlight.childIndex, parentNode.childNodes.length - 1);
            if (parentNode.childNodes[childIndex]) {
              const beforeText = parentNode.childNodes[childIndex].textContent.substring(0, parentNode.childNodes[childIndex].textContent.indexOf(highlightElement.textContent));
              const afterText = parentNode.childNodes[childIndex].textContent.substring(parentNode.childNodes[childIndex].textContent.indexOf(highlightElement.textContent) + highlightElement.textContent.length);
              parentNode.childNodes[childIndex].textContent = beforeText;
              parentNode.insertBefore(highlightElement, parentNode.childNodes[childIndex].nextSibling);
              const textNode = document.createTextNode(afterText);
              parentNode.insertBefore(textNode, highlightElement.nextSibling);
            } else {
              console.warn('Child node at childIndex not found, inserting instead.');
              parentNode.appendChild(highlightElement);
            }
            console.log('Highlight inserted successfully.');

            // Add event listener to show delete button on click
            highlightElement.addEventListener('click', function (event) {
              event.stopPropagation(); // Prevent the event from bubbling up

              // Create delete button
              let deleteButton = highlightElement.querySelector('.delete-button');
              if (!deleteButton) {
                deleteButton = document.createElement('span');
                deleteButton.textContent = 'X';
                deleteButton.className = 'delete-button';
                highlightElement.appendChild(deleteButton);
                console.log('Delete button created:', deleteButton); // Log to check creation

                // Add event listener to delete button
                deleteButton.addEventListener('click', function (event) {
                  event.stopPropagation(); // Prevent the event from bubbling up

                  // Remove highlight from DOM
                  highlightElement.outerHTML = highlightElement.innerHTML;

                  // Update storage
                  const updatedHighlights = highlights.filter(h => h.html !== highlight.html);
                  chrome.storage.local.set({ highlights: updatedHighlights }, () => {
                    console.log('Highlight deleted successfully.');
                  });
                });
              }

              // Remove delete button on clicking elsewhere on the document
              document.addEventListener('click', function removeDeleteButton() {
                if (deleteButton) {
                  deleteButton.remove();
                }
                document.removeEventListener('click', removeDeleteButton);
              });
            });
          } else {
            console.error('Highlight element not found in tempDiv:', tempDiv);
          }
        } else {
          console.error('Parent node not found for XPath:', highlight.parentXPath);
        }
      }
    });

    function getNodeByXPath(xpath) {
      try {
        const evaluator = new XPathEvaluator();
        const result = evaluator.evaluate(xpath, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return result.singleNodeValue;
      } catch (error) {
        console.error('XPath evaluation error:', error);
        return null;
      }
    }
  });

  // Inject CSS for delete button
  const style = document.createElement('style');
  style.textContent = `
    .highlight {
      position: relative;
      display: inline;
    }

    .highlight .delete-button {
      content: 'X';
      position: absolute;
      top: -10px;
      right: -10px;
      background-color: #ff4d4d;
      color: white;
      font-size: 12px;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
      z-index: 1000; /* Ensure it is above other elements */
      line-height: 1; /* Center the 'X' properly */
      display: none; /* Hide by default */
    }

    .highlight:hover .delete-button {
      display: flex; /* Show when highlight is hovered */
    }
  `;
  document.head.appendChild(style);
});
