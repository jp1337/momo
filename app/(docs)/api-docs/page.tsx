"use client";

/**
 * /api-docs
 * Interactive API documentation powered by Swagger UI.
 *
 * Loads the OpenAPI 3.1.0 spec from /api/openapi.json and renders a
 * full-page Swagger UI instance. Both Bearer token and session cookie auth
 * can be tested directly from the browser using the "Authorize" button.
 */

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

/**
 * API documentation page.
 * Renders Swagger UI pointed at the local OpenAPI spec endpoint.
 * persistAuthorization keeps the Bearer token across page refreshes.
 * tryItOutEnabled opens the "Try it out" panel by default for each operation.
 */
export default function ApiDocsPage() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <SwaggerUI
        url="/api/openapi.json"
        persistAuthorization={true}
        tryItOutEnabled={true}
      />
    </div>
  );
}
