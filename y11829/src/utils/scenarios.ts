import type { ScenarioConfig } from "@/types/game";

export const scenarios: ScenarioConfig[] = [
  {
    id: "A",
    name: "场景A：VIP挤占触发队列重排",
    description:
      "柜台1正在服务普通客户A，柜台2空闲，队列中有B、C。VIP客户D到达后挤占队列，若分配到柜台1则中断A的服务，触发柜台冷却。",
    counterCount: 3,
    schedule: [
      {
        tick: 1,
        type: "customer_arrive",
        payload: {
          customers: [
            {
              name: "客户A",
              vipLevel: 0,
              isAppointment: false,
              businessType: "deposit",
              serviceTime: 5,
            },
            {
              name: "客户B",
              vipLevel: 0,
              isAppointment: false,
              businessType: "withdraw",
              serviceTime: 4,
            },
          ],
        },
      },
      {
        tick: 4,
        type: "customer_arrive",
        payload: {
          customers: [
            {
              name: "客户C",
              vipLevel: 0,
              isAppointment: false,
              businessType: "transfer",
              serviceTime: 3,
            },
            {
              name: "VIP-D",
              vipLevel: 3,
              isAppointment: false,
              businessType: "loan",
              serviceTime: 4,
            },
          ],
        },
      },
    ],
  },
  {
    id: "B",
    name: "场景B：预约过号 + 柜台故障触发资源冷却",
    description:
      "预约客户E等待中，柜台1故障导致资源冷却，E的预约窗口耗尽过号，普通客户F被迫等待。",
    counterCount: 2,
    schedule: [
      {
        tick: 1,
        type: "customer_arrive",
        payload: {
          customers: [
            {
              name: "预约-E",
              vipLevel: 0,
              isAppointment: true,
              appointmentWindow: 15,
              businessType: "card",
              serviceTime: 3,
            },
            {
              name: "客户F",
              vipLevel: 0,
              isAppointment: false,
              businessType: "deposit",
              serviceTime: 4,
            },
          ],
        },
      },
      {
        tick: 3,
        type: "counter_broken",
        payload: {
          counterIndex: 0,
          brokenDuration: 5,
        },
      },
      {
        tick: 8,
        type: "customer_arrive",
        payload: {
          customers: [
            {
              name: "客户G",
              vipLevel: 1,
              isAppointment: false,
              businessType: "transfer",
              serviceTime: 3,
            },
          ],
        },
      },
    ],
  },
  {
    id: "C",
    name: "场景C：综合实战",
    description:
      "VIP挤占、预约过号、柜台故障同时发生，考验综合处理能力。",
    counterCount: 3,
    schedule: [
      {
        tick: 1,
        type: "customer_arrive",
        payload: {
          customers: [
            {
              name: "客户H",
              vipLevel: 0,
              isAppointment: false,
              businessType: "deposit",
              serviceTime: 5,
            },
            {
              name: "预约-I",
              vipLevel: 0,
              isAppointment: true,
              appointmentWindow: 12,
              businessType: "withdraw",
              serviceTime: 3,
            },
          ],
        },
      },
      {
        tick: 3,
        type: "customer_arrive",
        payload: {
          customers: [
            {
              name: "VIP-J",
              vipLevel: 2,
              isAppointment: false,
              businessType: "loan",
              serviceTime: 3,
            },
            {
              name: "客户K",
              vipLevel: 0,
              isAppointment: false,
              businessType: "card",
              serviceTime: 4,
            },
          ],
        },
      },
      {
        tick: 5,
        type: "counter_broken",
        payload: {
          counterIndex: 1,
          brokenDuration: 5,
        },
      },
      {
        tick: 7,
        type: "customer_arrive",
        payload: {
          customers: [
            {
              name: "VIP-L",
              vipLevel: 3,
              isAppointment: false,
              businessType: "transfer",
              serviceTime: 2,
            },
          ],
        },
      },
    ],
  },
];
