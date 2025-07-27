import http from "http";
import { IncomingMessage, ServerResponse } from "http";

// Contact Interface
interface Contact {
  id: number;
  phoneNumber: string;
  email: string;
  linkedId: number | null;
}

// In-memory contact Array
const contacts: Contact[] = [];

//send error response
const errorResponse = (message: string, statusCode = 400) => {
  return { message, statusCode };
};

// Parse request body
const parseBody = (req: IncomingMessage): Promise<any> => {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
  });
};

// Send JSON response
const send = (res: ServerResponse, statusCode: number, data: any): void => {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
};

// Build structured response
const buildResponse = (primaryId: number, contactsList: Contact[]) => {
  const primaryContact = contactsList.find((c) => c.id === primaryId);
  if (!primaryContact) {
    return errorResponse("Primary contact not found");
  }

  const relatedContacts = contactsList.filter(
    (c) => c.id === primaryId || c.linkedId === primaryId
  );

  const secondaryContacts = relatedContacts.filter((c) => c.id !== primaryId);

  const emails = Array.from(
    new Set([primaryContact.email, ...secondaryContacts.map((c) => c.email)])
  );

  const phoneNumbers = Array.from(
    new Set([
      primaryContact.phoneNumber,
      ...secondaryContacts.map((c) => c.phoneNumber),
    ])
  );

  const secondaryContactIds = secondaryContacts.map((c) => c.id);

  return {
    contact: {
      primaryContactId: primaryId,
      emails,
      phoneNumbers,
      secondaryContactIds,
    },
  };
};

// Server
const server = http.createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    const { method, url } = req;

    if (method === "POST" && url === "/identify") {
      const { email, phoneNumber } = await parseBody(req);

      if (!email || !phoneNumber) {
        return send(
          res,
          400,
          errorResponse("Email and phone number are required!")
        );
      }

      const contactByEmail = contacts.find((c) => c.email === email);
      const contactByPhone = contacts.find((c) => c.phoneNumber === phoneNumber);

      if (!contactByEmail && !contactByPhone) {
        const newId = Date.now();
        contacts.push({ id: newId, phoneNumber, email, linkedId: null });
        const response = buildResponse(newId, contacts);
        return send(res, 201, response);
      } else {
        const primaryContact =
          contactByPhone || contactByEmail || contacts[0]; // fallback

        const newId = Date.now();
        contacts.push({
          id: newId,
          phoneNumber,
          email,
          linkedId: primaryContact.id,
        });

        const response = buildResponse(primaryContact.id, contacts);
        return send(res, 201, response);
      }
    }

    if (method === "GET" && url?.startsWith("/view/")) {
      const idStr = url.split("/")[2];
      const id = Number(idStr);

      const contact = contacts.find((c) => c.id === id);
      if (contact) {
        const response = buildResponse(contact.id, contacts);
        return send(res, 200, response);
      }
      return send(res, 404, errorResponse("Contact ID not found", 404));
    }

    if (method === "GET" && url === "/view") {
      return send(res, 200, contacts);
    }

    return send(res, 404, errorResponse("Route not found", 404));
  }
);

server.listen(3000, () =>
  console.log("Server running at http://localhost:3000")
);
