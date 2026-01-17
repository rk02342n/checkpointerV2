// import { hc } from 'hono/client';
// import { type ApiRoutes } from "../../../server/app"; // should be @server/app but viteconfig and tsconfig code doesnt work properly

import { queryOptions } from "@tanstack/react-query";

// const client = hc<ApiRoutes>('/');

// export const api = client.api;


// Hono client error causing it to error out

async function getCurrentUser() {
    const res = await fetch("api/me")
    // client will let us do this instead - helps make everything typesafe
    // const res = await api.me.$get() // not working because of error caused by hono client
    if(!res.ok){
      throw new Error("Server error");
    }
    const data = await res.json()
    return data
  }

export const userQueryOptions = queryOptions({
    queryKey: ['get-current-user'],
    queryFn: getCurrentUser,
    staleTime: Infinity // basically caches the user profile so it doesn't load each time user goes to the profile tab
  }) 