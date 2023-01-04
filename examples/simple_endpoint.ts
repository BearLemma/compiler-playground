export type Route<QueryParams, ResponseType> = {
    methods: string[];
    pathPattern: string;
    handler: Handler<QueryParams, ResponseType>;
};

/** A request handler that maps HTTP request to an HTTP response. */
export type Handler<QueryParams, ResponseType> = (
    query: QueryParams,
) => ResponseType | Promise<ResponseType>;


export class RouteMap {
    routes: Route<unknown, unknown>[];

    /** Creates an empty `RouteMap`. */
    constructor() {
        this.routes = [];
    }

    route<QueryParams, ResponseType>(
        method: string | string[],
        path: string,
        handler: Handler<QueryParams, ResponseType>,
        internalMetaInformation?: string
    ): this {
        const methods = Array.isArray(method) ? method : [method];
        const pathPattern = path[0] !== "/" ? "/" + path : path;
        this.routes.push({
            methods,
            pathPattern,
            handler,
        });
        console.log(internalMetaInformation);
        return this;
    }
}


const routeMap = new RouteMap();
const aliasedRouteMap = routeMap;

type PeopleQuery = {
    maxAge?: number,
    firstName?: string
}

type Person = {
    firstName: string,
    lastName: string,
    age: number
}

aliasedRouteMap.route("GET", "/people", (q: PeopleQuery) => {
    return {
        firstName: "Jan",
        lastName: "Nejedly",
        age: 100
    };
})

const bagr = routeMap.route;

bagr<PeopleQuery, Person>("GET", "/people", (q: PeopleQuery) => {
    return {
        firstName: "Martin",
        lastName: "Novy",
        age: 77
    };
})

export default routeMap;
