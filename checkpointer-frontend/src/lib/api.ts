// import { hc } from 'hono/client';
// import { type ApiRoutes } from "../../../server/app"; // should be @server/app but viteconfig and tsconfig code doesnt work properly
// const client = hc<ApiRoutes>('/');
// export const api = client.api;
// Hono client error causing it to error out
import { queryOptions } from "@tanstack/react-query";

import { type CreateExpense} from "../../../server/sharedTypes";

async function getCurrentUser() {
    const res = await fetch("/api/me")
    // const res = await api.me.$get() // not working because of error caused by hono client
    if(!res.ok){
      throw new Error("Server error");
    }
    const data = await res.json()
    return data
  }
async function getDbUser() {
    const res = await fetch("api/user/account")
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
    staleTime: Infinity // Tells react when the cache data is stale - specifically the user profile so it doesn't load each time user goes to the profile tab
  })
  export const dbUserQueryOptions = queryOptions({
    queryKey: ['get-db-user'],
    queryFn: getDbUser,
    staleTime: Infinity // Tells react when the cache data is stale - specifically the user profile so it doesn't load each time user goes to the profile tab
  })

export async function getAllExpenses() {
  // await new Promise((r) => setTimeout(r, 2000)) // fake delay to test skeleton
  const res = await fetch("api/expenses")

  // client will let us use RPC instead - helps make everything typesafe
  // const res = await api.expenses.$get() // not working because of error caused by hono client
  if(!res.ok){
    throw new Error("Server error");
  }
  const data = await res.json()
  return data
}


export const getAllExpensesQueryOptions = queryOptions({
  queryKey: ['get-all-expenses'], 
  queryFn: getAllExpenses,
  staleTime: 1000 * 60 * 5
})

export async function createExpense({value} : {value: CreateExpense}){ 
  await new Promise((r) => setTimeout(r, 3000))
  const res = await fetch("/api/expenses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  })
  if(!res.ok){
    throw new Error("Error while submitting")
  }
  const newExpense = await res.json();
  return newExpense;
}

export const loadingCreateExpenseQueryOptions = queryOptions<{
  expense?: CreateExpense
}>({
  queryKey: ['loading-create-expense'],
  queryFn: async () => {
    return {};
  },
  staleTime: Infinity
});

export async function deleteExpense({id}: {id: number}) {
  // await new Promise((r) => setTimeout(r, 3000))
  const res = await fetch(`/api/expenses/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Server error");
  }
  const data = await res.json();
  return data;
}
