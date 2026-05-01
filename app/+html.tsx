import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Web-only HTML shell for the Expo Router app.
 * Ensures html/body/#root fill the full viewport so flex:1 chains work correctly
 * (required for fixed-height two-pane layouts that rely on flex:1 propagation).
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html style={{ height: '100%' }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        {/* Resets default browser ScrollView styles for cross-platform consistency */}
        <ScrollViewStyleReset />
        <style
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                height: 100%;
                margin: 0;
                padding: 0;
                overflow: hidden;
              }
              #root {
                display: flex;
                height: 100%;
              }
            `,
          }}
        />
      </head>
      <body style={{ height: '100%', overflow: 'hidden' }}>{children}</body>
    </html>
  );
}
