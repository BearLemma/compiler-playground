export type Route = {
    methods: string[];
    pathPattern: string;
    handler: AnonymousHandler;
    metaInfo: RouteMetaInfo;
};

export type QueryParamValue = undefined | boolean | string | number;
export type QueryParamsType = Record<string, QueryParamValue>;

/** A request handler that maps HTTP request to an HTTP response. */
export type Handler<QueryParams extends QueryParamsType, ResponseType> = (
    query: QueryParams
) => ResponseType | Promise<ResponseType>;
export type AnonymousHandler = (query: unknown) => unknown | Promise<unknown>;

export type RouteMetaInfo = { paramsTypeId: number; returnTypeId: number };

export class RouteMap {
    routes: Route[];

    /** Creates an empty `RouteMap`. */
    constructor() {
        this.routes = [];
    }

    route<QueryParams extends QueryParamsType, ResponseType>(
        method: string | string[],
        path: string,
        handler: Handler<QueryParams, ResponseType>,
        metaInfo?: RouteMetaInfo
    ): this {
        const methods = Array.isArray(method) ? method : [method];
        const pathPattern = path[0] !== "/" ? "/" + path : path;
        this.routes.push({
            methods,
            pathPattern,
            handler,
            metaInfo,
        });
        return this;
    }
}

const routeMap = new RouteMap();
const aliasedRouteMap = routeMap;

type PeopleQuery = {
    maxAge?: number;
    firstName?: string;
};

type Person = {
    firstName: string;
    lastName: string;
    age: number;
    birthDate: Date;
    favoriteColors: string[];
};

aliasedRouteMap.route("GET", "/people", (q: PeopleQuery) => {
    return {
        firstName: "Jan",
        lastName: "Nejedly",
        age: 100,
        birthDate: new Date(),
        favoriteColors: ["Bagr", "Trol", "LoL"],
    };
});

const bagr = routeMap.route;

bagr<PeopleQuery, Person>("GET", "/people", (q: PeopleQuery) => {
    return {
        firstName: "Martin",
        lastName: "Novy",
        age: 77,
        birthDate: new Date(),
        favoriteColors: ["blue"],
    };
});

export default routeMap;
