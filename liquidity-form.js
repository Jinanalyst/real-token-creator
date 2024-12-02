document.addEventListener('DOMContentLoaded', function() {
    // Min Order Size and Tick Size Update
    const minOrderSizeInput = document.getElementById('min-order-size');
    const minOrderSizeValue = document.getElementById('min-order-size-value');

    // Increase and Decrease Min Order Size
    document.getElementById('min-order-size-increment').addEventListener('click', function() {
        minOrderSizeInput.value = parseFloat(minOrderSizeInput.value) + 0.01;
        minOrderSizeValue.textContent = minOrderSizeInput.value;
    });
    document.getElementById('min-order-size-decrement').addEventListener('click', function() {
        minOrderSizeInput.value = Math.max(parseFloat(minOrderSizeInput.value) - 0.01, 0);
        minOrderSizeValue.textContent = minOrderSizeInput.value;
    });

    const tickSizeInput = document.getElementById('tick-size');
    const tickSizeValue = document.getElementById('tick-size-value');

    // Increase and Decrease Tick Size
    document.getElementById('tick-size-increment').addEventListener('click', function() {
        tickSizeInput.value = parseFloat(tickSizeInput.value) + 0.01;
        tickSizeValue.textContent = tickSizeInput.value;
    });
    document.getElementById('tick-size-decrement').addEventListener('click', function() {
        tickSizeInput.value = Math.max(parseFloat(tickSizeInput.value) - 0.01, 0);
        tickSizeValue.textContent = tickSizeInput.value;
    });

    // Token Selection Logic
    const baseTokenButton = document.getElementById("base-token");
    const quoteTokenButton = document.getElementById("quote-token");

    baseTokenButton.addEventListener("click", async () => {
        const tokens = await fetchTokensFromWallet();
        showTokenList(tokens, "base-token");
    });

    quoteTokenButton.addEventListener("click", async () => {
        const tokens = await fetchTokensFromWallet();
        showTokenList(tokens, "quote-token");
    });

    async function fetchTokensFromWallet() {
        // Placeholder function for fetching tokens from wallet
        // Replace this with actual wallet interaction logic
        return [
            { symbol: "SOL", address: "Solana address" },
            { symbol: "USDT", address: "USDT address" }
        ];
    }

    function showTokenList(tokens, type) {
        // Display a modal or dropdown with the token list
        console.log(`Show token list for ${type}`, tokens);
        // Example: Show a modal or dropdown with the available tokens
    }
});