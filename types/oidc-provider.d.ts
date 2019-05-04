/** oidc-provider */
declare module 'oidc-provider' {
  import Koa, { Context } from 'koa'

  namespace Provider {
    /**
     * Config Strings
     */
    type grantType = 'authorization_code' | 'implicit' | 'refresh_token';
    type subjectType = 'public' | 'pairwise';
    type signingAlgorithm = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'PS256' | 'PS384' | 'PS512' | 'ES256' | 'ES384' | 'ES512';
    type encryptionAlgorithm = 'RSA-OAEP' | 'RSA1_5' | 'ECDH-ES' | 'ECDH-ES+A128KW' | 'ECDH-ES+A192KW' | 'ECDH-ES+A256KW' | 'A128KW' | 'A192KW' | 'A256KW' | 'A128GCMKW' | 'A192GCMKW' | 'A256GCMKW' | 'PBES2-HS256+A128KW' | 'PBES2-HS384+A192KW' | 'PBES2-HS512+A256KW';
    type encryptionEnc = 'A128CBC-HS256' | 'A128GCM' | 'A192CBC-HS384' | 'A192GCM' | 'A256CBC-HS512' | 'A256GCM';
    type tokenEndpointAuthMethod = 'none' | 'client_secret_basic' | 'client_secret_post' | 'client_secret_jwt' | 'private_key_jwt' | 'tls_client_auth' | 'self_signed_tls_client_auth';

    /**
     * Provider Config
     */
    export interface ProviderConfiguration {
      features?: {
        backchannelLogout?: boolean | {
          enabled?: boolean
        }
        certificateBoundAccessTokens?: boolean | {
          enabled?: boolean
        }
        claimsParameter?: boolean | {
          enabled?: boolean
        }
        clientCredentials?: boolean | {
          enabled?: boolean
        }
        devInteractions?: boolean | {
          enabled?: boolean
        }
        deviceFlow?: {
          enabled?: boolean
          charset?: 'base-20' | 'digits'
          mask?: string
          deviceInfo?: (ctx: Context) => any
          userCodeInputSource?: (ctx: Context, form: string, out?: any, err?: Error) => Promise<void>
          userCodeConfirmSource?: (ctx: Context, form: string, client: any, devaiceInfo: any, userCode: string) => Promise<void>
          successSource?: (ctx: Context) => Promise<void>
        }
        discovery?: boolean | {
          enabled?: boolean
        }
        encryption?: boolean | {
          enabled?: boolean
        }
        frontchannelLogout?: boolean | {
          enabled?: boolean
          logoutPendingSource?: (ctx: Context, frames: string[], postLogoutRedirectUri: string, timeout: number) => Promise<void>
        }
        introspection?: boolean | {
          enabled?: boolean
        }
        jwtIntrospection?: boolean | {
          enabled?: boolean
        }
        jwtResponseModes?: boolean | {
          enabled?: boolean
        }
        registration?: boolean | {
          enabled?: boolean
          initialAccessToken?: boolean
          policies?: {
            [policyName: string]: ((ctx: Context, properties: { [key: string]: any }) => Promise<void>) | ((ctx: Context, properties: Object) => void)
          }
          idFactory?: (ctx: Context) => string
          secretFactory?: () => string
        }
        registrationManagement?: boolean | {
          enabled?: boolean,
          rotateRegistrationAccessToken?: boolean
        }
        request?: boolean | {
          enabled?: boolean
        }
        requestUri?: boolean | {
          enabled?: boolean
          requireUriRegistration?: boolean
        }
        resourceIndicators?: boolean | {
          enabled?: boolean
        }
        revocation?: boolean | {
          enabled?: boolean
        }
        sessionManagement?: boolean | {
          enabled?: boolean
          keepHeaders?: boolean
        }
        webMessageResponseMode?: boolean | {
          enabled?: boolean
        }
      }
      acrValues?: string[]
      audiences?: (ctx: Context, sub: string, token: string, use: 'access_token' | 'client_credentials') => Promise<string[] | false | null | undefined | 0 | ''>
      claims?: {
        [claim: string]: string[]
      }
      clockTolerance?: number
      conformIdTokenClaims?: boolean
      cookies?: {
        keys?: string[]
        long?: {
          secure?: boolean
          signed?: boolean
          httpOnly?: boolean
          maxAge?: number
          overwrite?: boolean
        }
        names?: {
          session?: string
          interaction?: string
          resume?: string
          state?: string
        }
        short?: {
          secure?: boolean
          signed?: boolean
          httpOnly?: boolean
          maxAge?: number
          overwrite?: boolean
        }
      }
      discovery?: {
        [property: string]: any
      }
      dynamicScopes?: RegExp[]
      expiresWithSession?: (ctx: Context, token: string) => boolean
      extraClientMetadata?: {
        properties?: string[]
        validator?: (key: string, value: any, metadata: { [key: string]: any }) => void
      }
      extraParams?: string[] | Set<string>
      findById?: (ctx: Context, sub: string, token: string) => Promise<{
        accountId: string
        claims: (use: 'id_token' | 'userinfo', scope: string, claims: Object, rejected: string[]) => Promise<any>
      }>
      formats?: {
        extraJwtAccessTokenClaims?: (ctx: Context, token: string) => Promise<{ [claim: string]: string }> | { [claim: string]: string }
        AccessToken?: 'jwt' | 'opaque' | ((ctx: Context, token: string) => 'jwt' | 'opaque')
      }
      interactionUrl?: (ctx: Context, interaction?: string) => string | Promise<string>
      introspectionEndpointAuthMethods?: string[]
      issueRefreshToken?: (ctx: Context, client: any, code: string) => Promise<string>
      logoutSource?: (ctx: Context, form: string) => Promise<void>
      pairwiseIdentifier?: (ctx: Context, accountId: string, client: any) => Promise<string>
      pkceMethods?: ('S256' | 'plain')[]
      postLogoutRedirectUri?: (ctx: Context) => Promise<string>
      renderError?: (ctx: Context, out: any, error: Error) => Promise<void>
      responseTypes?: string[]
      rotateRefreshToken?: boolean | ((ctx: Context) => Promise<any>)
      routes?: {
        authorization?: string
        certificates?: string
        check_session?: string
        device_authorization?: string
        end_session?: string
        introspection?: string
        registration?: string
        revocation?: string
        token?: string
        userinfo?: string
        code_verification?: string
      }
      scopes?: string[]
      subjectTypes?: subjectType[]
      tokenEndpointAuthMethods?: tokenEndpointAuthMethod[]
      ttl?: {
        AccessToken: number | ((ctx: Context, token: string, client: any) => Promise<number>)
        AuthorizationCode: number | ((ctx: Context, token: string, client: any) => Promise<number>)
        ClientCredentials: number | ((ctx: Context, token: string, client: any) => Promise<number>)
        DeviceCode: number | ((ctx: Context, token: string, client: any) => Promise<number>)
        IdToken: number | ((ctx: Context, token: string, client: any) => Promise<number>)
        RefreshToken: number | ((ctx: Context, token: string, client: any) => Promise<number>)
      }
      uniqueness?: (ctx: Context, jti: string, expiresAt: number) => Promise<boolean>
      whitelistedJWA?: {
        authorizationEncryptionAlgValues?: encryptionAlgorithm[]
        authorizationSigningAlgValues?: signingAlgorithm[]
        idTokenEncryptionAlgValues?: encryptionAlgorithm[]
        idTokenEncryptionEncValues?: encryptionEnc[]
        idTokenSigningAlgValues?: ('none' | signingAlgorithm)[]
        introspectionEncryptionAlgValues?: encryptionAlgorithm[]
        introspectionEncryptionEncValues?: encryptionEnc[]
        introspectionEndpointAuthSigningAlgValues?: signingAlgorithm[]
        introspectionSigningAlgValues?: ('none' | signingAlgorithm)[]
        requestObjectEncryptionAlgValues?: encryptionAlgorithm[]
        requestObjectEncryptionEncValues?: encryptionEnc[]
        requestObjectSigningAlgValues?: ('none' | signingAlgorithm)[]
        revocationEndpointAuthSigningAlgValues?: signingAlgorithm[]
        tokenEndpointAuthSigningAlgValues?: signingAlgorithm[]
        userinfoEncryptionAlgValues?: encryptionAlgorithm[]
        userinfoEncryptionEncValues?: encryptionEnc[]
        userinfoSigningAlgValues?: ('none' | signingAlgorithm)[]
      }
    }

    /**
     * Adapter
     */
    interface Adapter {
      name: string;
      upsert(id: string, payload: any, expiresIn: number): Promise<void>;
      find(id: string): Promise<any>;
      findByUserCode?: (userCode: string) => Promise<any>;
      consume(id: string): Promise<void>;
      destroy(id: string): Promise<void>;
      connect?: (provider: Provider) => Promise<void>;
    }

    /**
     * Initialization Configuration
     */
    interface InitializationConfiguration {
      clients?: ClientConfiguration[];
      keystore?: { keys: Object[] };
      adapter?: new (...args: any[]) => Adapter
    }

    /**
     * Client Config
     */
    interface ClientConfiguration {
      client_id: string;
      redirect_uris: string[];
      response_types?: string[];
      grant_types?: grantType[];
      application_type?: 'web' | 'native';
      contacts?: string[];
      client_name?: string;
      logo_uri?: string;
      client_uri?: string;
      policy_uri?: string;
      tos_uri?: string;
      jwks_uri?: string;
      jwks?: Object;
      sector_identifier_uri?: string;
      subject_type?: subjectType;
      id_token_signed_response_alg?: signingAlgorithm;
      id_token_encrypted_response_alg?: encryptionAlgorithm;
      id_token_encrypted_response_enc?: encryptionEnc;
      userinfo_signed_response_alg?: signingAlgorithm;
      userinfo_encrypted_response_alg?: encryptionAlgorithm;
      userinfo_encrypted_response_enc?: encryptionEnc;
      request_object_signing_alg?: signingAlgorithm;
      request_object_encryption_alg?: encryptionAlgorithm;
      request_object_encryption_enc?: encryptionEnc;
      token_endpoint_auth_method?: tokenEndpointAuthMethod;
      token_endpoint_auth_signing_alg?: signingAlgorithm;
      default_max_age?: number;
      require_auth_time?: boolean;
      default_acr_values?: string[];
      initiate_login_uri?: string;
      request_uris?: string[];
    }

    /**
     * Interaction Detail
     */
  }

  /**
   * Default Provider Class
   */
  class Provider {
    proxy: boolean;
    keys: string[];
    app: Koa;
    constructor(issuer: string, config?: Provider.ProviderConfiguration);
    cookieName(...args: any[]): void;
    httpOptions(...args: any[]): void;
    initialize(config: Provider.InitializationConfiguration): Promise<void>;
    interactionDetails(...args: any[]): Promise<any>;
    interactionFinished(...args: any[]): void;
    interactionResult(...args: any[]): void;
    listen(...args: any[]): void;
    pathFor(...args: any[]): void;
    registerGrantType(...args: any[]): void;
    registerResponseMode(...args: any[]): void;
    setProviderSession(...args: any[]): void;
    urlFor(...args: any[]): void;
    use(...args: any[]): void;
    callback(...args: any[]): void;
    static asKey(key: any, form: any, extras: any): any;
    static asKeyStore(ks: any): any;
    static createKeyStore(): any;
    static defaultMaxListeners: number;
    static init(): void;
    static listenerCount(emitter: any, type: any): any;
    static useGot(...args: any[]): void;
    static useRequest(...args: any[]): void;
    static usingDomains: boolean;
    static errors: any;
  }

  export = Provider
}

/*
export = oidc_provider;

declare class oidc_provider {
  constructor(issuer: string, config?: ProviderSetup);

  cookieName(...args: any[]): void;

  httpOptions(...args: any[]): void;

  initialize(...args: any[]): void;

  interactionDetails(...args: any[]): void;

  interactionFinished(...args: any[]): void;

  interactionResult(...args: any[]): void;

  listen(...args: any[]): void;

  pathFor(...args: any[]): void;

  registerGrantType(...args: any[]): void;

  registerResponseMode(...args: any[]): void;

  setProviderSession(...args: any[]): void;

  urlFor(...args: any[]): void;

  use(...args: any[]): void;

  static asKey(key: any, form: any, extras: any): any;

  static asKeyStore(ks: any): any;

  static createKeyStore(): any;

  static defaultMaxListeners: number;

  static init(): void;

  static listenerCount(emitter: any, type: any): any;

  static useGot(...args: any[]): void;

  static useRequest(...args: any[]): void;

  static usingDomains: boolean;

}

declare namespace oidc_provider {
  

  class AdapterTest {
    constructor(...args: any[]);

    accessTokenDestroy(...args: any[]): void;

    accessTokenFind(...args: any[]): void;

    accessTokenSave(...args: any[]): void;

    authorizationCodeConsume(...args: any[]): void;

    authorizationCodeFind(...args: any[]): void;

    authorizationCodeInsert(...args: any[]): void;

    execute(...args: any[]): void;

  }

  class EventEmitter {
    constructor();

    addListener(type: any, listener: any): any;

    emit(type: any, ...args: any[]): any;

    eventNames(): any;

    getMaxListeners(): any;

    listenerCount(type: any): any;

    listeners(type: any): any;

    on(type: any, listener: any): any;

    once(type: any, listener: any): any;

    prependListener(type: any, listener: any): any;

    prependOnceListener(type: any, listener: any): any;

    removeAllListeners(type: any, ...args: any[]): any;

    removeListener(type: any, listener: any): any;

    setMaxListeners(n: any): any;

    static EventEmitter: any;

    static defaultMaxListeners: number;

    static init(): void;

    static listenerCount(emitter: any, type: any): any;

    static usingDomains: boolean;

  }

  namespace AdapterTest {
    namespace prototype {
      function accessTokenDestroy(...args: any[]): void;

      function accessTokenFind(...args: any[]): void;

      function accessTokenSave(...args: any[]): void;

      function authorizationCodeConsume(...args: any[]): void;

      function authorizationCodeFind(...args: any[]): void;

      function authorizationCodeInsert(...args: any[]): void;

      function execute(...args: any[]): void;

    }

  }

  namespace EventEmitter {
    namespace init {
      const prototype: {
      };

    }

    namespace listenerCount {
      const prototype: {
      };

    }

    namespace prototype {
      const domain: any;

      function addListener(type: any, listener: any): any;

      function emit(type: any, ...args: any[]): any;

      function eventNames(): any;

      function getMaxListeners(): any;

      function listenerCount(type: any): any;

      function listeners(type: any): any;

      function on(type: any, listener: any): any;

      function once(type: any, listener: any): any;

      function prependListener(type: any, listener: any): any;

      function prependOnceListener(type: any, listener: any): any;

      function removeAllListeners(type: any, ...args: any[]): any;

      function removeListener(type: any, listener: any): any;

      function setMaxListeners(n: any): any;

      namespace addListener {
        const prototype: {
        };

      }

      namespace emit {
        const prototype: {
        };

      }

      namespace eventNames {
        const prototype: {
        };

      }

      namespace getMaxListeners {
        const prototype: {
        };

      }

      namespace listenerCount {
        const prototype: {
        };

      }

      namespace listeners {
        const prototype: {
        };

      }

      namespace on {
        const prototype: {
        };

      }

      namespace once {
        const prototype: {
        };

      }

      namespace prependListener {
        const prototype: {
        };

      }

      namespace prependOnceListener {
        const prototype: {
        };

      }

      namespace removeAllListeners {
        const prototype: {
        };

      }

      namespace removeListener {
        const prototype: {
        };

      }

      namespace setMaxListeners {
        const prototype: {
        };

      }

    }

  }

  namespace asKey {
    const prototype: {
    };

  }

  namespace asKeyStore {
    const prototype: {
    };

  }

  namespace createKeyStore {
    const prototype: {
    };

  }

  namespace errors {
    function AccessDenied(...args: any[]): void;

    function AuthorizationPending(...args: any[]): void;

    function ConsentRequired(...args: any[]): void;

    function ExpiredToken(...args: any[]): void;

    function InteractionRequired(...args: any[]): void;

    function InvalidClient(...args: any[]): void;

    function InvalidClientAuth(...args: any[]): void;

    function InvalidClientMetadata(...args: any[]): void;

    function InvalidGrant(...args: any[]): void;

    function InvalidRequest(...args: any[]): void;

    function InvalidRequestObject(...args: any[]): void;

    function InvalidRequestUri(...args: any[]): void;

    function InvalidScope(...args: any[]): void;

    function InvalidTarget(...args: any[]): void;

    function InvalidToken(...args: any[]): void;

    function LoginRequired(...args: any[]): void;

    function RedirectUriMismatch(...args: any[]): void;

    function RegistrationNotSupported(...args: any[]): void;

    function RequestNotSupported(...args: any[]): void;

    function RequestUriNotSupported(...args: any[]): void;

    function SessionNotFound(...args: any[]): void;

    function SlowDown(...args: any[]): void;

    function TemporarilyUnavailable(...args: any[]): void;

    function UnauthorizedClient(...args: any[]): void;

    function UnsupportedGrantType(...args: any[]): void;

    function UnsupportedResponseMode(...args: any[]): void;

    function UnsupportedResponseType(...args: any[]): void;

    function WebMessageUriMismatch(...args: any[]): void;

    namespace AccessDenied {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace AuthorizationPending {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace ConsentRequired {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace ExpiredToken {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace InteractionRequired {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace InvalidClient {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace InvalidClientAuth {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace InvalidClientMetadata {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace InvalidGrant {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace InvalidRequest {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace InvalidRequestObject {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace InvalidRequestUri {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace InvalidScope {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace InvalidTarget {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace InvalidToken {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace LoginRequired {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace RedirectUriMismatch {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace RegistrationNotSupported {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace RequestNotSupported {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace RequestUriNotSupported {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace SessionNotFound {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace SlowDown {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace TemporarilyUnavailable {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace UnauthorizedClient {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace UnsupportedGrantType {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace UnsupportedResponseMode {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace UnsupportedResponseType {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

    namespace WebMessageUriMismatch {
      const prepareStackTrace: any;

      const stackTraceLimit: number;

      function captureStackTrace(p0: any, p1: any): any;

      namespace prototype {
        const message: string;

        const name: string;

        function toString(): any;

      }

    }

  }

  namespace init {
    const prototype: {
    };

  }

  namespace listenerCount {
    const prototype: {
    };

  }

  namespace prototype {
    const AccessToken: any;

    const Account: any;

    const AuthorizationCode: any;

    const BaseToken: any;

    const Claims: any;

    const Client: any;

    const ClientCredentials: any;

    const DeviceCode: any;

    const IdToken: any;

    const InitialAccessToken: any;

    const OIDCContext: any;

    const RefreshToken: any;

    const RegistrationAccessToken: any;

    const Session: any;

    const app: any;

    const callback: any;

    const defaultHttpOptions: any;

    const domain: any;

    const env: any;

    const keys: any;

    const proxy: any;

    const subdomainOffset: any;

    function addListener(type: any, listener: any): any;

    function cookieName(...args: any[]): void;

    function emit(type: any, ...args: any[]): any;

    function eventNames(): any;

    function getMaxListeners(): any;

    function httpOptions(...args: any[]): void;

    function initialize(...args: any[]): void;

    function interactionDetails(...args: any[]): void;

    function interactionFinished(...args: any[]): void;

    function interactionResult(...args: any[]): void;

    function listen(...args: any[]): void;

    function listenerCount(type: any): any;

    function listeners(type: any): any;

    function on(type: any, listener: any): any;

    function once(type: any, listener: any): any;

    function pathFor(...args: any[]): void;

    function prependListener(type: any, listener: any): any;

    function prependOnceListener(type: any, listener: any): any;

    function registerGrantType(...args: any[]): void;

    function registerResponseMode(...args: any[]): void;

    function removeAllListeners(type: any, ...args: any[]): any;

    function removeListener(type: any, listener: any): any;

    function setMaxListeners(n: any): any;

    function setProviderSession(...args: any[]): void;

    function urlFor(...args: any[]): void;

    function use(...args: any[]): void;

    namespace addListener {
      const prototype: {
      };

    }

    namespace emit {
      const prototype: {
      };

    }

    namespace eventNames {
      const prototype: {
      };

    }

    namespace getMaxListeners {
      const prototype: {
      };

    }

    namespace listenerCount {
      const prototype: {
      };

    }

    namespace listeners {
      const prototype: {
      };

    }

    namespace on {
      const prototype: {
      };

    }

    namespace once {
      const prototype: {
      };

    }

    namespace prependListener {
      const prototype: {
      };

    }

    namespace prependOnceListener {
      const prototype: {
      };

    }

    namespace removeAllListeners {
      const prototype: {
      };

    }

    namespace removeListener {
      const prototype: {
      };

    }

    namespace setMaxListeners {
      const prototype: {
      };

    }

  }

}

*/