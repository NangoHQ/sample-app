import type { AppProps } from 'next/app';
import Head from 'next/head';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Layout from '../components/Layout';

import '../globals.css';

const queryClient = new QueryClient();

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Head>
        <title key="title">WolfCRM</title>
      </Head>
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
      </QueryClientProvider>
    </Layout>
  );
}
