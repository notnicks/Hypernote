# Microsoft Store Submission Guide

This guide describes how to finalize your configuration and submit Hypernote to the Microsoft Store.

## 1. Get Your Publisher Information

To fill in the placeholders in `electron-builder.yml`, you need to register as a Windows App Developer.

1.  Go to the [Microsoft Partner Center](https://partner.microsoft.com/en-us/dashboard).
2.  Register for a developer account (Standard or Company).
3.  Once registered, create a new app submission to reserve your app name.
4.  Navigate to **Product management** > **Product Identity**.
5.  Copy the following values:
    *   **Package/Identity/Name**: Use this for `identityName` in `electron-builder.yml`.
    *   **Package/Identity/Publisher**: Use this for `publisher` in `electron-builder.yml` (e.g., `CN=...`).
    *   **Package/Properties/PublisherDisplayName**: Use this for `publisherDisplayName`.

## 2. Finalize `electron-builder.yml`

Update [electron-builder.yml](file:///Users/nickshell/Hypernote/electron-builder.yml) with the values obtained above:

```yaml
appx:
  publisher: "CN=YOUR-DASHBOARD-PUBLISHER-ID"
  publisherDisplayName: "Your Name/Company Name"
  identityName: "YourAppIdentityName"
```

## 3. Build the MSIX Package

Run the following command in your terminal:

```bash
npm run build:win
```

This will generate an `.msix` (or `.appx`) file in the `dist` or `out` directory.

## 4. Submit to Partner Center

1.  Return to your app submission in the [Partner Center](https://partner.microsoft.com/en-us/dashboard).
2.  Upload the generated `.msix` file under **Packages**.
3.  Complete the other sections: **Store listing**, **Pricing and availability**, **Age ratings**, etc.
4.  Submit your application for review.

> [!TIP]
> **Code Signing**: When submitting to the Microsoft Store, Microsoft will sign the package for you. However, if you want to test the package locally before submission, you might need a self-signed certificate or enable "Side-loading" in Windows Settings.
