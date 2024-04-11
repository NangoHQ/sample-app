import type { AppProps } from 'next/app';
import Head from 'next/head';
import { QueryClientProvider } from '@tanstack/react-query';

import Layout from '../components/Layout';

import '../globals.css';
import { queryClient } from '../utils';

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
