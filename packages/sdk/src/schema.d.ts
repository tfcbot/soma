export interface paths {
    "/v1/balance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get credit balance
         * @description Return the calling key's account role and credit balance.
         */
        get: operations["getBalance"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/todo": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List todos
         * @description Return all work state.
         */
        get: operations["listTodos"];
        put?: never;
        /**
         * Intake a todo
         * @description Create a todo in `requested`. The single client write.
         */
        post: operations["createTodo"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/todo/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a todo */
        get: operations["getTodo"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/todo/{id}/advance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Advance a todo's state
         * @description Move the todo along a legal lifecycle edge. Illegal edges return 409.
         */
        post: operations["advanceTodo"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/todo/{id}/comment": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Comment on a todo
         * @description Append a note. On a delivered todo, bounces it to `revise`.
         */
        post: operations["commentTodo"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/todo/{id}/deliver": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Deliver an artifact
         * @description Publish a sandbox artifact to the filesystem/CDN, mark delivered, and notify by email.
         */
        post: operations["deliverTodo"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/todo/{id}/fund": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Fund a prepaid card
         * @description Issue a prepaid card within the todo's budget envelope.
         */
        post: operations["fundTodo"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        AdvanceRequest: {
            /** @description Target state. Must be a legal edge from the current state. */
            to: components["schemas"]["TodoState"];
        };
        /** @description Error envelope returned by every non-2xx response. */
        ApiError: {
            /** @description Machine-readable error code, e.g. bad_request, not_found, operation_error. */
            error: string;
            /** @description Human-readable explanation. */
            message: string;
        };
        /** @description A caller's credit balance. */
        Balance: {
            accountId: string;
            /** Format: int32 */
            creditsCents: number;
            /** Format: int32 */
            spentCents: number;
        };
        BearerAuth: {
            /**
             * @description Http authentication
             * @enum {string}
             */
            type: "http";
            /**
             * @description bearer auth scheme
             * @enum {string}
             */
            scheme: "bearer";
        };
        /** @description The authorized spend envelope for a todo. The prepaid card limit is the hard ceiling. */
        BudgetRef: {
            /**
             * Format: int32
             * @description Authorized ceiling, in cents.
             */
            authorized: number;
            /**
             * Format: int32
             * @description Amount spent so far, in cents.
             */
            spent: number;
            /** @description ISO 4217 currency code, e.g. USD. */
            currency: string;
        };
        CommentRequest: {
            /** @description A note. On a `delivered` todo this bounces it to `revise`. */
            note: string;
        };
        /** @description Intake body — the one client write. Creates a todo in `requested`. */
        CreateTodoRequest: {
            title: string;
            brief: string;
            channelOrigin?: string;
            budget?: components["schemas"]["BudgetRef"];
        };
        /** @description Deliver an artifact: pull from sandbox → publish to filesystem/CDN → mark delivered → email. */
        DeliverRequest: {
            sandboxPath: string;
            filename: string;
            /** @description Email recipient for the delivery notification. */
            recipient: string;
        };
        /** @description Provision a prepaid card within the todo's authorized budget envelope. */
        FundRequest: {
            /** Format: int32 */
            amountCents: number;
            memo: string;
            /** @description Optional phone/email to notify that a card was funded. */
            recipient?: string;
        };
        /** @description Result of funding a card for a todo: the updated todo plus the issued card. */
        FundResult: {
            todo: components["schemas"]["Todo"];
            card: components["schemas"]["IssuedCard"];
        };
        /** @description A prepaid virtual card issued against a todo's budget envelope. */
        IssuedCard: {
            id: string;
            pan: string;
            cvv: string;
            expiry: string;
            /** Format: int32 */
            spendLimitCents: number;
            last4?: string;
        };
        /** @description RFC 7807 Problem Details body for HTTP 402, returned when a metered key lacks the credits for a call. Content-Type: application/problem+json. Paired with a `WWW-Authenticate: Payment` header so a payment-capable agent (MPP / x402) can settle inline. */
        PaymentRequiredProblem: {
            /**
             * @description Problem type URI.
             * @default https://paymentauth.org/problems/payment-required
             */
            type: string;
            /**
             * @description Short human-readable summary.
             * @default Payment Required
             */
            title: string;
            /**
             * Format: int32
             * @description HTTP status (always 402).
             * @default 402
             */
            status: number;
            /** @description Human-readable explanation. */
            detail: string;
            /**
             * Format: int32
             * @description Credits (cents) required for this call.
             */
            required: number;
            /**
             * Format: int32
             * @description Caller's current balance (cents).
             */
            balance: number;
            /** @description URL to top up credits. */
            topupUrl: string;
        };
        /** @description The Todo: the unit of work and the unit of observability (SPEC.md §10). */
        Todo: {
            /** @description Server-assigned id, e.g. td_…. */
            id: string;
            title: string;
            state: components["schemas"]["TodoState"];
            brief: string;
            /** @description Where the work was briefed from, e.g. sms:+1…, email:… */
            channelOrigin?: string;
            budget?: components["schemas"]["BudgetRef"];
            /** @description Deliverable pointers (archil://… / s3://… / CDN url), populated at `delivered`. */
            artifacts: string[];
            ref?: components["schemas"]["TodoRef"];
            history: components["schemas"]["TodoHistoryEntry"][];
            /**
             * Format: int64
             * @description Epoch milliseconds.
             */
            createdAt: number;
            /**
             * Format: int64
             * @description Epoch milliseconds.
             */
            updatedAt: number;
        };
        /** @description One entry in a todo's append-only state history. */
        TodoHistoryEntry: {
            state: components["schemas"]["TodoState"];
            /**
             * Format: int64
             * @description Epoch milliseconds.
             */
            ts: number;
            /** @description Who caused the transition, e.g. provider, agent, principal. */
            actor: string;
        };
        /** @description A git ref pinning the sandbox workspace state for a todo. */
        TodoRef: {
            branch: string;
            commit: string;
        };
        /**
         * @description The fixed todo lifecycle (SPEC.md §10). Not a workflow engine — just legal states.
         * @enum {string}
         */
        TodoState: "requested" | "accepted" | "in_production" | "qa" | "delivered" | "approved" | "revise";
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getBalance: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The request has succeeded. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Balance"];
                };
            };
            /** @description 401 Unauthorized — missing or invalid 'Authorization: Bearer <key>'. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    listTodos: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The request has succeeded. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Todo"][];
                };
            };
            /** @description 401 Unauthorized — missing or invalid 'Authorization: Bearer <key>'. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    createTodo: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTodoRequest"];
            };
        };
        responses: {
            /** @description 201 Created — the new todo. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Todo"];
                };
            };
            /** @description 400 Bad Request — missing or invalid fields. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description 401 Unauthorized — missing or invalid 'Authorization: Bearer <key>'. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description 402 Payment Required — metered key has insufficient credits. */
            402: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["PaymentRequiredProblem"];
                };
            };
        };
    };
    getTodo: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The request has succeeded. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Todo"];
                };
            };
            /** @description 401 Unauthorized — missing or invalid 'Authorization: Bearer <key>'. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description 404 Not Found — no todo with that id, or unknown action. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    advanceTodo: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdvanceRequest"];
            };
        };
        responses: {
            /** @description The request has succeeded. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Todo"];
                };
            };
            /** @description 400 Bad Request — missing or invalid fields. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description 409 Conflict — illegal state transition or vendor operation failure. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    commentTodo: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CommentRequest"];
            };
        };
        responses: {
            /** @description The request has succeeded. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Todo"];
                };
            };
            /** @description 400 Bad Request — missing or invalid fields. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description 409 Conflict — illegal state transition or vendor operation failure. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    deliverTodo: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeliverRequest"];
            };
        };
        responses: {
            /** @description The request has succeeded. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Todo"];
                };
            };
            /** @description 400 Bad Request — missing or invalid fields. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description 402 Payment Required — metered key has insufficient credits. */
            402: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["PaymentRequiredProblem"];
                };
            };
            /** @description 409 Conflict — illegal state transition or vendor operation failure. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    fundTodo: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FundRequest"];
            };
        };
        responses: {
            /** @description The request has succeeded. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FundResult"];
                };
            };
            /** @description 400 Bad Request — missing or invalid fields. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description 402 Payment Required — metered key has insufficient credits. */
            402: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["PaymentRequiredProblem"];
                };
            };
            /** @description 409 Conflict — illegal state transition or vendor operation failure. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
}
