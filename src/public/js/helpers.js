function activateElement(element) {
    element.classList.add("is-active");
}

function deActivateElement(element) {
    element.classList.remove("is-active");
}

function showElement(element) {
    element.classList.remove("is-hidden");
}

function hideElement(element) {
    element.classList.add("is-hidden");
}

function disableElement(element) {
    element.disabled = true;
}

function enableElement(element) {
    element.disabled = false;
}

export { activateElement, deActivateElement, showElement, hideElement, disableElement, enableElement };
