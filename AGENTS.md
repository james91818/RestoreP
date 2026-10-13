# Architecture rules

- Email previews accept the managed server API key or a verified staff JWT checked through `is_staff_member`; CRM requests render a single registered template with customer data so previews remain private and match the outgoing message.