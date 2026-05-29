import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WarehouseProvider } from "@/context/WarehouseContext";
import { Layout } from "@/components/Layout";
import Queue from "@/pages/Queue";
import Docks from "@/pages/Docks";
import Yard from "@/pages/Yard";
import Console from "@/pages/Console";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Queue} />
        <Route path="/docks" component={Docks} />
        <Route path="/yard" component={Yard} />
        <Route path="/console" component={Console} />
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WarehouseProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </WarehouseProvider>
    </QueryClientProvider>
  );
}
