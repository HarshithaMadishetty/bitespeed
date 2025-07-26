import http from "http";
import { IncomingMessage, ServerResponse } from "http";

interface Contact {
  id: number;
  phoneNumber: string;
  email: string;
  linkedId: number | null;
}

const con: Contact[] = [];

const errorResponse = (message: string, statusCode = 400) => {
  return { message, statusCode };
};

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

function send(res: ServerResponse, statusCode: number, data: any): void {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const buildResponse = (primaryId: number, contacts: Contact[]) => {
  const primaryContact = contacts.find((c) => c.id === primaryId);
  if (!primaryContact) {
    return errorResponse("Primary");
  }
  const relatedContacts = contacts.filter(
    (c) => c.id === primaryId || c.linkedId === primaryId
  );
  const secondaryContacts = relatedContacts.filter((f) => f.id !== primaryId);

  const emails = [
    primaryContact.email,
    ...secondaryContacts.map((e) => e.email),
  ];
  const phoneNumebers = [
    primaryContact.phoneNumber,
    ...secondaryContacts.map((p) => p.phoneNumber),
  ];
  const secondaryContactIds = [...secondaryContacts.map((i) => i.id)];

  return {
    contact: {
      primaryContactId: primaryId,
      emails,
      phoneNumebers,
      secondaryContactIds,
    },
  };
};
const server = http.createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    const { method, url } = req;

    if (method === "POST" && url === "/identify") {
      const { email, phoneNumber } = await parseBody(req);
      if (!email || !phoneNumber) {
        return send(
          res,
          400,
          errorResponse("email and phone number are required!!")
        );
      }
      const userEmail = con.find((u) => u.email === email);
      const userPhone = con.find((u) => u.phoneNumber === phoneNumber);
      if (!userEmail && !userPhone) {
        const preId = Date.now();
        con.push({ id: preId, phoneNumber, email, linkedId: null });
        const data= buildResponse(preId, con);
        return send(res,201,data);
      } else if (userEmail && !userPhone) {
        const eIndex = con.findIndex((u) => u.email === email);
        console.log("eindex", eIndex);
        const preId = Date.now();
        con.push({ id: preId, phoneNumber, email, linkedId: eIndex });
        const data= buildResponse(preId, con);
        return send(res,201,data);
      } else {
        const pIndex = con.findIndex((u) => u.phoneNumber === phoneNumber);
        const preId = Date.now();
        con.push({ id: preId, phoneNumber, email, linkedId: null });
        console.log("pIndex", pIndex);
        const data= buildResponse(preId, con);
        return send(res,201,data);
      }
    }
    
  });

  server.listen(3000, () =>
      console.log("Server running at http://localhost:3000")
    );