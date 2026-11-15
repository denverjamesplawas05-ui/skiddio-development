"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthLinkForwarder() {
  const router = useRouter();

  useEffect(() => {
    const { hash, search } = window.location;
    if (/[#&](access_token|error_description|type)=/.test(hash) || /[?&]code=/.test(search)) {
      router.replace(`/dashboard${search}${hash}`);
    }
  }, [router]);

  return null;
}
