// Function to toggle the visibility of the network options dropdown
function toggleNetworkDropdown() {
    const networkOptions = document.getElementById('network-options');
    networkOptions.classList.toggle('hidden'); // Show or hide the dropdown
}

// Function to handle network selection
function selectNetwork(network) {
    console.log(`Network selected: ${network}`);

    // Update the button text to show the selected network
    const networkButton = document.getElementById('network-selector');
    networkButton.textContent = `Connected to ${capitalizeFirstLetter(network)}`;

    // Optionally: Store the selected network or change network in wallet logic here

    // Hide the dropdown after selection
    const networkOptions = document.getElementById('network-options');
    networkOptions.classList.add('hidden');
}

// Function to capitalize the first letter of the string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}